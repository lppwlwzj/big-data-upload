interface RequestOptions extends RequestInit {
  data?: any;
  responseType?: "json" | "text" | "blob";
  requestList?: XMLHttpRequest[];
}

export const request = <T>(url: string, options: RequestOptions): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const {
      method = "POST",
      headers = { "content-type": "application/json" },
      data,
      responseType,
      requestList,
      ...rest
    } = options;
    console.log(url, data instanceof FormData);
    const xhr = new XMLHttpRequest();

    xhr.open(method, url);

    if (responseType) {
      xhr.responseType = responseType;
    }

    // 如果不是 FormData，则设置默认的 content-type
    if (!(data instanceof FormData)) {
      // 设置请求头
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, headers[key]);
      });
    }

    // 发送数据，如果是 FormData 直接发送，否则转换为 JSON 字符串
    xhr.send(data instanceof FormData ? data : data ? JSON.stringify(data) : null);

    // 处理成功响应
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (requestList) {
          const xhrIndex = requestList.findIndex((item) => item === xhr);
          requestList.splice(xhrIndex, 1);
        }

        // 根据 responseType 处理响应
        let response;
        try {
          if (xhr.responseType === "" || xhr.responseType === "text") {
            response = xhr.responseText;
            if (
              headers["content-type"]?.includes("application/json") ||
              responseType === "json"
            ) {
              response = JSON.parse(response);
            }
          } else {
            response = xhr.response;
          }
          resolve(response as T);
        } catch (error) {
          reject(new Error("Failed to parse response"));
        }
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    // 处理错误
    xhr.onerror = () => {
      reject(new Error("Network error"));
    };
    
    if (requestList) {
      requestList.push(xhr);
    }
  });
};
