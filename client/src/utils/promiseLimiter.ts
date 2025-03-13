import axios from "axios";

//简单控制请求并发数
// export const promiseLimiter = (promises: Promise<any>[], limit: number) => {
//   return new Promise((resolve, reject) => {
//     const queue = [...promises];
//     let count = 0;
//     const runTask = () => {
//       if (queue.length === 0) return;
//       const task = queue.shift();
//       count++;
//       task
//         ?.then((res) => res)
//         .finally(() => {
//           count--;
//           if (count < limit && queue.length) runTask();
//           else if (queue.length === 0 && count === 0) {
//             //请求池清空了 有需要可以传入一个全部请求完成的callback
//             resolve(true);
//           }
//         });
//     };
//     for (let i = 0; i < limit; i++) {
//       runTask();
//     }
//   });
// };

// 定义返回值类型
type PromiseResult<T> = {
  data: T;
  error?: Error;
};
// 定义请求工厂函数类型
type PromiseFn<T> = () => Promise<T>;

// 添加暂停状态控制
let isPaused = false;

export const pauseUpload = () => {
  isPaused = true;
};

export const resumeUpload = () => {
  isPaused = false;
};

export const promiseLimiter = <T>(
  promises: PromiseFn<T>[],
  limit: number,
  timeout: number = 30000
): Promise<PromiseResult<T>[]> => {
  if (!promises.length) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const results: PromiseResult<T>[] = new Array(promises.length);
    const queue = [...promises];
    let count = 0;
    let completed = 0;

    const runTask = (index: number) => {
      // 如果暂停了，就不继续执行新的任务
      if (isPaused || queue.length === 0) return;

      const _promise = queue.shift();
      if (!_promise) return;

      count++;

      // 这里才真正创建并执行 Promise
      const task = _promise();

      // 添加超时控制
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), timeout);
      });

      Promise.race([task, timeoutPromise])
        .then((res) => {
          results[index] = { data: res };
        })
        .catch((error) => {
          results[index] = { data: null as T, error };
        })
        .finally(() => {
          count--;
          completed++;

          // 只有在未暂停的情况下才继续执行下一个任务
          if (!isPaused && count < limit && queue.length) {
            runTask(promises.length - queue.length);
          }

          if (completed === promises.length) {
            resolve(results);
          }
        });
    };

    const initialCount = Math.min(limit, promises.length);
    for (let i = 0; i < initialCount; i++) {
      runTask(i);
    }
  });
};

//法二
// const requestQueue = (concurrency: number) => {
//   concurrency = concurrency || 6;
//   const queue: (() => Promise<any>)[] = [];
//   let current = 0;

//   const dequeue = () => {
//     while (current < concurrency && queue.length) {
//       current++;
//       const requestPromiseFn = queue.shift();
//       if (requestPromiseFn) {
//         requestPromiseFn()
//           .then((result) => {
//             // 上传成功处理
//             console.log(result);
//           })
//           .catch((error) => {
//             // 失败
//             console.log(error);
//           })
//           .finally(() => {
//             current--;
//             dequeue();
//           });
//       }
//     }
//   };

//   return (requestPromiseFn) => {
//     queue.push(requestPromiseFn);
//     dequeue();
//   };
// };

// //use
// const enqueue = requestQueue(6);
// for (let i = 0; i < 100; i++) {
//   enqueue(() =>
//     axios.post("/api/upload", {
//       data: {},
//       headers: {
//         "Content-Type": "multipart/form-data"
//       }
//     })
//   );
// }
