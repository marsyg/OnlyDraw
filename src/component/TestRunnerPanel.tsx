'use client';

import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import canvasDoc, { LOCAL_ORIGIN } from '@/Store/yjs-store';
import { elementType } from '@/types/type';
import { getBounds } from '@/lib/utils/boundsUtility/getBounds';
import { getCompoundBounds } from '@/lib/utils/boundsUtility/compoundBounds';
import { isInsideRectangle } from '@/lib/hitTest/rectangle';
import { isNearLine } from '@/lib/hitTest/line';
import { isInsideText } from '@/lib/hitTest/text';
import { isInsideEllipse } from '@/lib/hitTest/ellipse';
import resizeBound from '@/lib/resizeBound';
import { resizeText } from '@/lib/resizeElement';
import { groupElements, ungroupElements, parseGroupIds, getGroupMembers } from '@/lib/grouping';
import { findNearestSnapTarget, getBindingPosition } from '@/lib/arrowSnap';
import { serializeYElement, deserializeYElement } from '@/lib/clipboard';
import { nanoid } from 'nanoid';

export type TestCaseResult = {
  id: string;
  name: string;
  category: 'core' | 'transform' | 'group' | 'arrow' | 'history' | 'edge';
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
  details?: string;
};

export type FullTestReport = {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestCaseResult[];
};

export default function TestRunnerPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<FullTestReport | null>(null);

  const runAllTests = async (): Promise<FullTestReport> => {
    setIsRunning(true);
    const startTime = performance.now();
    const results: TestCaseResult[] = [];
    const doc = canvasDoc.doc;
    const yElement = canvasDoc.yElement;
    const order = canvasDoc.order;

    const record = (
      id: string,
      name: string,
      category: TestCaseResult['category'],
      fn: () => void | Promise<void>
    ) => {
      const t0 = performance.now();
      try {
        fn();
        results.push({
          id,
          name,
          category,
          status: 'passed',
          durationMs: Math.round((performance.now() - t0) * 100) / 100,
        });
      } catch (err: any) {
        results.push({
          id,
          name,
          category,
          status: 'failed',
          durationMs: Math.round((performance.now() - t0) * 100) / 100,
          error: err?.message || String(err),
          details: err?.stack,
        });
      }
    };

    const testDoc = new Y.Doc();
    const testMap = testDoc.getMap<Y.Map<unknown>>('elements');
    const makeEl = (data: Record<string, unknown>) => {
      const el = new Y.Map<unknown>();
      const id = String(data.id || nanoid());
      testMap.set(id, el);
      for (const [k, v] of Object.entries(data)) {
        el.set(k, v);
      }
      return el;
    };

    // 1. Core Shape Creation
    record('core_rect', 'Rectangle Creation & Bounds', 'core', () => {
      const id = `test_rect_${Date.now()}`;
      const rect = new Y.Map<unknown>();
      rect.set('id', id);
      rect.set('type', elementType.Rectangle);
      rect.set('x', 200);
      rect.set('y', 200);
      rect.set('width', 150);
      rect.set('height', 100);
      doc.transact(() => yElement.set(id, rect), LOCAL_ORIGIN);

      const b = getBounds({ element: rect });
      if (b.x !== 200 || b.y !== 200 || b.width !== 150 || b.height !== 100) {
        throw new Error(`Bounds mismatch: expected 200,200 150x100 but got ${b.x},${b.y} ${b.width}x${b.height}`);
      }
      if (!isInsideRectangle({ point: [250, 250], element: rect })) {
        throw new Error('Hit test failed inside rectangle');
      }
      doc.transact(() => yElement.delete(id), LOCAL_ORIGIN);
    });

    record('core_ellipse', 'Ellipse Geometry & Radial Hit Test', 'core', () => {
      const ell = makeEl({
        type: elementType.Ellipse,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });

      if (!isInsideEllipse({ point: [150, 150], element: ell })) {
        throw new Error('Center point of ellipse was not hit');
      }
      if (isInsideEllipse({ point: [102, 102], element: ell })) {
        throw new Error('Corner point outside inscribed ellipse was falsely hit');
      }
    });

    record('core_line', 'Line & Arrow Segment Hit Detection', 'core', () => {
      const line = makeEl({
        type: elementType.Line,
        x: 50,
        y: 50,
        width: 100,
        height: 0,
      });

      if (!isNearLine({ point: [100, 52], element: line })) {
        throw new Error('Point 2px from line was not hit');
      }
      if (isNearLine({ point: [100, 75], element: line })) {
        throw new Error('Point 25px away from line was falsely hit');
      }
    });

    record('core_text_create', 'Text Element Font Size & Bounding Calculation', 'core', () => {
      const txt = makeEl({
        type: elementType.Text,
        text: 'Canvas Test',
        fontSize: 28,
        x: 300,
        y: 300,
        width: 140,
        height: 36,
      });

      const b = getBounds({ element: txt });
      if (b.width !== 140 || b.height !== 36) {
        throw new Error(`Text bounds expected 140x36 but got ${b.width}x${b.height}`);
      }
      if (!isInsideText({ point: [320, 310], element: txt })) {
        throw new Error('Text hit test failed inside text bounds');
      }
    });

    // 2. Transformations
    record('transform_resize_handles', 'Resize Bounds on 8 Directional Handles', 'transform', () => {
      const orig = { x: 100, y: 100, width: 100, height: 100 };
      const se = resizeBound('se', [200, 200], [250, 240], orig, false);
      if (se.width !== 150 || se.height !== 140) {
        throw new Error(`SE handle mismatch: ${se.width}x${se.height}`);
      }
      const nw = resizeBound('nw', [100, 100], [80, 60], orig, false);
      if (nw.x !== 80 || nw.y !== 60 || nw.width !== 120 || nw.height !== 140) {
        throw new Error(`NW handle mismatch: ${nw.x},${nw.y} ${nw.width}x${nw.height}`);
      }
    });

    record('transform_text_resize', 'Proportional Font Scaling During Text Resize', 'transform', () => {
      const txt = makeEl({
        id: 'txt_scale',
        type: elementType.Text,
        fontSize: 20,
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      });

      resizeText({
        element: txt,
        oldBounds: { x: 0, y: 0, width: 100, height: 40 },
        newBounds: { x: 0, y: 0, width: 250, height: 100 }, // 2.5x
        originalFontSize: 20,
      });

      if (txt.get('fontSize') !== 50) {
        throw new Error(`Expected font size 50 (20 * 2.5) but got ${txt.get('fontSize')}`);
      }
      if (txt.get('width') !== 250 || txt.get('height') !== 100) {
        throw new Error('Dimensions were not updated during resizeText');
      }
    });

    // 3. Grouping
    record('group_create_ungroup', 'Group Creation, Member Resolution & Ungrouping', 'group', () => {
      const el1 = new Y.Map<unknown>();
      el1.set('id', 'g_el1');
      el1.set('x', 10);
      el1.set('y', 10);
      yElement.set('g_el1', el1);

      const el2 = new Y.Map<unknown>();
      el2.set('id', 'g_el2');
      el2.set('x', 50);
      el2.set('y', 50);
      yElement.set('g_el2', el2);

      const gid = groupElements(['g_el1', 'g_el2'], yElement, doc);
      if (!gid) throw new Error('groupElements returned null for 2 elements');

      const members = getGroupMembers(el1, yElement);
      if (members.length !== 2 || !members.includes('g_el1') || !members.includes('g_el2')) {
        throw new Error(`Group members resolution failed: got ${JSON.stringify(members)}`);
      }

      ungroupElements(['g_el1'], yElement, doc);
      const afterGids = parseGroupIds(el1);
      if (afterGids.length !== 0) {
        throw new Error(`Ungroup failed, groupIds still present: ${JSON.stringify(afterGids)}`);
      }

      yElement.delete('g_el1');
      yElement.delete('g_el2');
    });

    record('group_compound_bounds', 'Compound Union Bounds for Group Selections', 'group', () => {
      const e1 = new Y.Map<unknown>();
      e1.set('id', 'cb_1');
      e1.set('type', elementType.Rectangle);
      e1.set('x', 100);
      e1.set('y', 100);
      e1.set('width', 100);
      e1.set('height', 50);
      yElement.set('cb_1', e1);

      const e2 = new Y.Map<unknown>();
      e2.set('id', 'cb_2');
      e2.set('type', elementType.Rectangle);
      e2.set('x', 250);
      e2.set('y', 180);
      e2.set('width', 50);
      e2.set('height', 70);
      yElement.set('cb_2', e2);

      const cb = getCompoundBounds(['cb_1', 'cb_2'], yElement);
      if (!cb) throw new Error('getCompoundBounds returned null');
      if (cb.x !== 100 || cb.y !== 100 || cb.width !== 200 || cb.height !== 150) {
        throw new Error(`Compound bounds expected 100,100 200x150 but got ${cb.x},${cb.y} ${cb.width}x${cb.height}`);
      }

      yElement.delete('cb_1');
      yElement.delete('cb_2');
    });

    // 4. Arrow Snapping
    record('arrow_snap_detection', 'Smart Snap Anchor Points & Target Detection', 'arrow', () => {
      const target = new Y.Map<unknown>();
      target.set('id', 'snap_box');
      target.set('type', elementType.Rectangle);
      target.set('x', 300);
      target.set('y', 300);
      target.set('width', 100);
      target.set('height', 100);
      yElement.set('snap_box', target);

      // Center is (350, 350). Cursor at (352, 348)
      const hit = findNearestSnapTarget([352, 348], yElement);
      if (!hit || hit.location !== 'center' || hit.elementId !== 'snap_box') {
        throw new Error(`Expected center snap but got: ${JSON.stringify(hit)}`);
      }

      const dynPos = getBindingPosition({ elementId: 'snap_box', point: 'top' }, yElement);
      if (!dynPos || dynPos[0] !== 350 || dynPos[1] !== 300) {
        throw new Error(`Dynamic binding position mismatch: ${JSON.stringify(dynPos)}`);
      }

      yElement.delete('snap_box');
    });

    // 5. History & Clipboard
    record('history_undo_redo', 'Yjs UndoManager Undo and Redo Execution', 'history', () => {
      const testId = `undo_${Date.now()}`;
      const undoManager = new Y.UndoManager([yElement, order], { trackedOrigins: new Set(['test_origin']) });

      doc.transact(() => {
        const item = new Y.Map<unknown>();
        item.set('id', testId);
        item.set('x', 50);
        yElement.set(testId, item);
        order.push([testId]);
      }, 'test_origin');

      if (!yElement.has(testId)) throw new Error('Item was not added');

      undoManager.undo();
      if (yElement.has(testId)) throw new Error('Undo failed to remove item');

      undoManager.redo();
      if (!yElement.has(testId)) throw new Error('Redo failed to restore item');

      doc.transact(() => {
        yElement.delete(testId);
        const idx = order.toArray().indexOf(testId);
        if (idx > -1) order.delete(idx, 1);
      }, LOCAL_ORIGIN);
    });

    // 6. Edge Cases
    record('edge_negative_rect_hittest', 'Hit Testing Rectangles Drawn In Reverse (Negative Width/Height)', 'edge', () => {
      const rev = makeEl({
        type: elementType.Rectangle,
        x: 300,
        y: 300,
        width: -100,
        height: -100,
      });

      // Bounding box spans x: [200, 300], y: [200, 300]
      const isInside = isInsideRectangle({ point: [250, 250], element: rev });
      if (!isInside) {
        throw new Error('BUG: isInsideRectangle fails on rectangles with negative width or height!');
      }
    });

    record('edge_zero_size_element', 'Handling Zero-Size Bounding Box (width=0, height=0)', 'edge', () => {
      const zero = makeEl({
        type: elementType.Rectangle,
        x: 100,
        y: 100,
        width: 0,
        height: 0,
      });

      const b = getBounds({ element: zero });
      if (b.width !== 0 || b.height !== 0) {
        throw new Error(`Zero-size bounds error: ${b.width}x${b.height}`);
      }
    });

    record('edge_deleted_arrow_binding', 'Graceful Handling of Arrow Binding to Deleted Shapes', 'edge', () => {
      const pos = getBindingPosition({ elementId: 'completely_nonexistent_id', point: 'center' }, yElement);
      if (pos !== null) {
        throw new Error('Expected null for nonexistent element binding');
      }
    });

    record('edge_single_element_grouping', 'Prevent Grouping Less Than 2 Elements', 'edge', () => {
      const res = groupElements(['single_item_only'], yElement, doc);
      if (res !== null) {
        throw new Error('groupElements should return null when selecting < 2 items');
      }
    });

    record('edge_clipboard_unintegrated_map', 'Clipboard Deserialization Points Structure', 'edge', () => {
      const data = {
        id: 'orig_1',
        type: elementType.Rectangle,
        x: 100,
        y: 100,
        width: 80,
        height: 60,
      };
      const deserialized = deserializeYElement(data, { x: 20, y: 20 });
      // In Yjs, checking properties on an unintegrated map before inserting into doc can fail or return undefined
      const idVal = deserialized.get('id');
      if (!idVal) {
        throw new Error('BUG: Deserialized Y.Map cannot be queried before integration into Y.Doc!');
      }
    });

    const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;
    const passedCount = results.filter((r) => r.status === 'passed').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    const fullReport: FullTestReport = {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      durationMs: totalDuration,
      results,
    };

    setReport(fullReport);
    setIsRunning(false);

    // Expose report on window for subagent / automation inspection
    if (typeof window !== 'undefined') {
      (window as any).__CANVAS_TEST_REPORT__ = fullReport;
    }

    return fullReport;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__RUN_CANVAS_TESTS__ = runAllTests;
    }
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 100 }}>
      {!isOpen ? (
        <button
          id="btn-run-tests"
          onClick={() => {
            setIsOpen(true);
            runAllTests();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#c7d2fe',
            border: '1px solid #4338ca',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>🧪</span>
          <span>{isRunning ? 'Running Tests...' : 'Test Suite'}</span>
          {report && (
            <span
              style={{
                background: report.failed > 0 ? '#ef4444' : '#10b981',
                color: '#fff',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '12px',
              }}
            >
              {report.passed}/{report.total}
            </span>
          )}
        </button>
      ) : (
        <div
          id="test-suite-panel"
          style={{
            width: '460px',
            maxHeight: '520px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🧪</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Canvas Feature & Edge Test Suite</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="btn-re-run-tests"
                disabled={isRunning}
                onClick={runAllTests}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isRunning ? 'Running...' : 'Re-run'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Summary Banner */}
          {report && (
            <div
              style={{
                padding: '10px 16px',
                background: report.failed > 0 ? '#450a0a' : '#064e3b',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span>
                {report.failed === 0 ? '✅ All Tests Passed' : `⚠️ ${report.failed} Issues Detected`}
              </span>
              <span>
                {report.passed} Passed / {report.failed} Failed ({report.durationMs}ms)
              </span>
            </div>
          )}

          {/* Test Case List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {report?.results.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: '8px 10px',
                  margin: '4px 0',
                  borderRadius: '6px',
                  background: t.status === 'passed' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${t.status === 'passed' ? '#334155' : '#ef4444'}`,
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{t.status === 'passed' ? '🟢' : '🔴'}</span>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>{t.durationMs}ms</span>
                </div>
                {t.error && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '6px 8px',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '4px',
                      color: '#f87171',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-word',
                    }}
                  >
                    {t.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
