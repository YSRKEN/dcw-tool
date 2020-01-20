import React, { useState, useEffect } from 'react';
import 'App.css';

const SERVER_PATH = window.location.port === '3001'
  ? 'http://127.0.0.1:5042'
  : window.location.protocol + '//' + window.location.host;

interface DocInfo {
  title: string;
  id: number;
  datetime: string;
  images: number;
  message: string;
}

const getDocInfo = async (doc_id: number): Promise<{ datetime: string, images: number, message: string }> => {
  const cacheKey = `docs/${doc_id}`;
  const cacheData = window.localStorage.getItem(cacheKey);
  if (cacheData !== null) {
    return JSON.parse(cacheData);
  } else {
    const docInfo = await (await fetch(SERVER_PATH + '/api/docs/' + doc_id)).json();
    window.localStorage.setItem(cacheKey, JSON.stringify(docInfo));
    return docInfo;
  }
};

const getDocList = async (): Promise<DocInfo[]> => {
  const docs: { title: string, doc_id: number }[] = await (await fetch(SERVER_PATH + '/api/docs')).json();
  const result: DocInfo[] = [];
  for (const doc of docs) {
    const docInfo = await getDocInfo(doc.doc_id);
    result.push({
      title: doc.title,
      id: doc.doc_id,
      datetime: docInfo.datetime,
      images: docInfo.images,
      message: docInfo.message
    });
  }
  return result;
};

type ViewMode = 'DocList' | 'DocView';

const App: React.FC = () => {
  const [docList, setDocList] = useState<DocInfo[]>([]);
  const [loadingFlg, setLoadingFlg] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('DocList');
  const [docInfo, setDocInfo] = useState<DocInfo>({
    title: '',
    id: 0,
    datetime: '',
    images: 0,
    message: ''
  });
  const [imageUrlList, setImageUrlList] = useState<string[]>([]);

  useEffect(() => {
    const initialize = async () => {
      const cacheData = window.localStorage.getItem('docs');
      if (cacheData !== null) {
        setDocList(JSON.parse(cacheData));
      } else {
        const docListData = await getDocList();
        setDocList(docListData);
        window.localStorage.setItem('docs', JSON.stringify(docListData));
      }
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const update = async () => {
      if (loadingFlg) {
        const docListData = await getDocList();
        setDocList(docListData);
        window.localStorage.setItem('docs', JSON.stringify(docListData));
        setLoadingFlg(false);
      }
    };
    update();
  }, [loadingFlg]);

  const upDateDocList = () => {
    setLoadingFlg(true);
  };

  const onClickDoc = async (index: number) => {
    setDocInfo({ ...docList[index] });
    const newImageUrlList: string[] = [];
    for (let i = 1; i <= docList[index].images; i++) {
      newImageUrlList.push(await loadImageUrl(docList[index].id, i));
    }
    setImageUrlList(newImageUrlList);
    setViewMode('DocView');
  };

  const loadImageUrl = async (id: number, index: number) => {
    const imageBinary = await (await fetch(SERVER_PATH + `/api/docs/${id}/images/${index}`)).blob();
    const url = window.URL || window.webkitURL;
    return url.createObjectURL(imageBinary);
  };

  switch (viewMode) {
    case 'DocList':
      return (
        <div className="container">
          <div className="row">
            <div className="col my-3">
              <h1 className="text-center">カメラバカ</h1>
            </div>
          </div>
          <div className="row">
            <div className="col my-3">
              <form>
                {
                  loadingFlg
                    ? <button type="button" className="btn btn-light" disabled>更新中...</button>
                    : <button type="button" className="btn btn-primary" onClick={upDateDocList}>話リストを更新</button>
                }
              </form>
            </div>
          </div>
          <div className="row">
            <div className="col my-3">
              <table className="table table-sm table-bordered table-responsive text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th scope="col">題名</th>
                    <th scope="col">日時</th>
                    <th scope="col">画</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    docList.map((record, index) => {
                      return (
                        <tr key={record.id}>
                          <td className="doc-button p-1 align-middle">
                            <button className="doc-button" onClick={() => onClickDoc(index)}>
                              {record.title}
                            </button>
                          </td>
                          <td>{record.datetime}</td>
                          <td>{record.images}</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    case 'DocView':
      return (
        <div className="container">
          <div className="row">
            <div className="col my-3">
              <span className="text-center"><strong>{docInfo.title}</strong></span>
            </div>
          </div>
          <div className="row">
            <div className="col my-3">
            <span className="text-center"><strong>【本編】</strong></span>
              {
                imageUrlList.map((url, index) => {
                  return (<div key={index}>
                    <img className="w-100 p-3" alt={'' + index} src={url} />
                  </div>);
                })
              }
              <span className="text-center"><strong>【解説】</strong></span>
              <pre className="doc-message">{docInfo.message}</pre>
            </div>
          </div>
        </div>
      );
  }
}

export default App;
