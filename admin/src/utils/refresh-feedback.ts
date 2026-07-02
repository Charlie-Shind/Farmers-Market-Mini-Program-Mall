import { ElMessage } from 'element-plus';

export function notifyDataRefreshed(message = '数据已刷新') {
  ElMessage.success({
    message,
    duration: 1500,
    grouping: true,
  });
}

export async function refreshWithFeedback(
  task: () => Promise<boolean | void>,
  successMessage?: string,
) {
  const result = await task();
  if (result !== false) {
    notifyDataRefreshed(successMessage);
  }
}
