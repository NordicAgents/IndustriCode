import path from 'path';
import type { ApplyPatchOperation } from '@openai/agents-core';
import { applyDiff } from '@openai/agents-core';
import { fileService } from './file-service.js';

export interface ApplyPatchSummaryItem {
  type: ApplyPatchOperation['type'];
  path: string;
  status: 'completed' | 'failed';
  message?: string;
}

const AGENT_ROOT_ENV_KEY = 'AGENT_ROOT_DIR';

const resolveOperationPath = (operationPath: string): string => {
  const root = process.env[AGENT_ROOT_ENV_KEY];
  if (root && !path.isAbsolute(operationPath)) {
    return path.resolve(root, operationPath);
  }

  return operationPath;
};

export async function applyPatchOperations(
  operations: ApplyPatchOperation[],
): Promise<ApplyPatchSummaryItem[]> {
  const results: ApplyPatchSummaryItem[] = [];

  for (const op of operations) {
    const targetPath = resolveOperationPath(op.path);

    try {
      if (op.type === 'create_file') {
        const content = applyDiff('', op.diff, 'create');
        await fileService.writeFile(targetPath, content);
        results.push({
          type: op.type,
          path: targetPath,
          status: 'completed',
          message: `Created ${targetPath}`,
        });
      } else if (op.type === 'update_file') {
        const original = await fileService.readFile(targetPath);
        const patched = applyDiff(original, op.diff, 'default');
        await fileService.writeFile(targetPath, patched);
        results.push({
          type: op.type,
          path: targetPath,
          status: 'completed',
          message: `Updated ${targetPath}`,
        });
      } else if (op.type === 'delete_file') {
        await fileService.deleteFile(targetPath);
        results.push({
          type: op.type,
          path: targetPath,
          status: 'completed',
          message: `Deleted ${targetPath}`,
        });
      }
    } catch (error: any) {
      results.push({
        type: op.type,
        path: targetPath,
        status: 'failed',
        message:
          error?.message ??
          `Error applying ${op.type} to ${targetPath}`,
      });
    }
  }

  return results;
}
