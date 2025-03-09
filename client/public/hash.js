self.importScripts("/spark-md5.min.js");

self.onmessage = (event) => {
  //修改时间+文件名称+最后修改时间-->MD5
  const { chunkList } = event.data;
  //通过chunkList 生成文件hash
  createFileHashByChunks(chunkList);
  //通过文件生成hash
  createFileHashByFile(file);
};

const createFileHashByChunks = (chunkList) => {
  const spark = new self.SparkMD5.ArrayBuffer();
  let hashPercentage = 0;
  let count = 0;
  const loadNext = (index) => {
    const reader = new FileReader();
    //每个切片都通过FileReader读取为ArrayBuffer
    reader.readAsArrayBuffer(chunkList[index]);
    reader.onload = (e) => {
      //e.target.result： ArrayBuffer
      count++;
      spark.append(e.target.result);
      if (count === chunkList.length) {
        self.postMessage({
          hash: spark.end(),
          hashPercentage: 100
        });
      } else {
        hashPercentage = Math.round((count / chunkList.length) * 100);
        self.postMessage({
          hashPercentage
        });
        loadNext(count);
      }
    };
    reader.onerror = function () {
      console.warn("oops, something went wrong.");
    };
  };
  loadNext(0);
};

const createFileHashByFile = (file, chunkSize) => {
  let hashPercentage = 0;
  let count = 0;
  const chunkLength = Math.ceil(file.size / chunkSize);
  const spark = new self.SparkMD5.ArrayBuffer();

  const loadNext = (index) => {
    const start = index * chunkSize,
      end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    const sliceFile = file.slice(start, end);
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(sliceFile);
    fileReader.onload = (e) => {
      count++;
      spark.append(e.target.result);
      if (count === chunkLength) {
        self.postMessage({
          hash: spark.end(),
          hashPercentage: 100
        });
      } else {
        hashPercentage = Math.round((count / chunkLength) * 100);
        self.postMessage({
          hashPercentage
        });
        loadNext(count);
      }
    };
  };
  loadNext(0);
};
