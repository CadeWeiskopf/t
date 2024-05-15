/// <reference lib="webworker" />

let d: {
  label: string;
  value: string;
  children: { label: string; value: string }[];
}[];
const pageSize = 100;

addEventListener('message', ({ data }) => {
  console.log('worker got message: ', data);
  if (!d) {
    d = loadTreeData();
    const initPageData = pageTreeData(0, data.pageSize, data.filter);
    postMessage(initPageData);
  } else {
    const pageData = pageTreeData(data.pageIndex, data.pageSize, data.filter);
    postMessage(pageData);
  }
});

const loadTreeData = () => {
  const d = [];
  const n = 10_000;
  const c = 1_000;
  for (let i = 0; i < n; i++) {
    const children = [];
    for (let k = 0; k < c; k++) {
      children.push({
        label: `child-${i}-${k}`,
        value: `child-value-${i}-${k}`,
      });
    }
    d.push({
      label: `node-${i}`,
      value: `node-value-${i}`,
      children,
    });
  }
  return d;
};

const pageTreeData = (pageIndex: number, pageSize: number, filter: string) => {
  if (!d) {
    console.error('returning, tried to pageTreeData before it has data');
    return;
  }
  console.log('page data', pageIndex, pageSize);
  const data = [];
  for (let i = pageIndex; i < d.length && data.length < pageSize; i++) {
    if (
      !filter ||
      d[i].label.toLowerCase().indexOf(filter.toLowerCase()) > -1
    ) {
      data.push(d[i]);
    }
  }
  return data;
};
