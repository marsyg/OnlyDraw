import * as Y from 'yjs';
import { nanoid } from 'nanoid';
import { LOCAL_ORIGIN } from '@/Store/yjs-store';

export function parseGroupIds(el: Y.Map<unknown>): string[] {
  const raw = el.get('groupIds');
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getGroupMembers(
  targetEl: Y.Map<unknown>,
  yElement: Y.Map<Y.Map<unknown>>
): string[] {
  const groupIds = parseGroupIds(targetEl);
  const targetId = targetEl.get('id') as string;
  if (!groupIds || groupIds.length === 0) {
    return [targetId];
  }

  // Find outermost group ID
  const outermostGroupId = groupIds[groupIds.length - 1];
  const members: string[] = [];

  yElement.forEach((el, id) => {
    if (!el.get('isDeleted')) {
      const gIds = parseGroupIds(el);
      if (gIds.includes(outermostGroupId)) {
        members.push(id);
      }
    }
  });

  return members.length > 0 ? members : [targetId];
}

export function groupElements(
  elementIds: string[],
  yElement: Y.Map<Y.Map<unknown>>,
  doc: Y.Doc
): string | null {
  if (elementIds.length < 2) return null;
  const newGroupId = `grp_${nanoid(8)}`;

  doc.transact(() => {
    elementIds.forEach((id) => {
      const el = yElement.get(id);
      if (el && !el.get('isDeleted')) {
        const existing = parseGroupIds(el);
        if (!existing.includes(newGroupId)) {
          el.set('groupIds', JSON.stringify([...existing, newGroupId]));
        }
      }
    });
  }, LOCAL_ORIGIN);

  return newGroupId;
}

export function ungroupElements(
  elementIds: string[],
  yElement: Y.Map<Y.Map<unknown>>,
  doc: Y.Doc
): void {
  if (elementIds.length === 0) return;

  // Find all outermost groups present among specified elements
  const groupsToUngroup = new Set<string>();
  elementIds.forEach((id) => {
    const el = yElement.get(id);
    if (el && !el.get('isDeleted')) {
      const existing = parseGroupIds(el);
      if (existing.length > 0) {
        groupsToUngroup.add(existing[existing.length - 1]);
      }
    }
  });

  if (groupsToUngroup.size === 0) return;

  doc.transact(() => {
    yElement.forEach((el) => {
      if (!el.get('isDeleted')) {
        const existing = parseGroupIds(el);
        const filtered = existing.filter((g) => !groupsToUngroup.has(g));
        if (filtered.length !== existing.length) {
          el.set('groupIds', JSON.stringify(filtered));
        }
      }
    });
  }, LOCAL_ORIGIN);
}

export function isElementGrouped(element: Y.Map<unknown>): boolean {
  return parseGroupIds(element).length > 0;
}
