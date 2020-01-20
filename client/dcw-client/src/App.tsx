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

const getDocInfo = async (doc_id: number): Promise<{datetime: string, images: number, message: string}> => {
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

const getDocList = async(): Promise<DocInfo[]> => {
  const docs: {title: string, doc_id: number}[] = await (await fetch(SERVER_PATH + '/api/docs')).json();
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

const App: React.FC = () => {
  const [docList, setDocList] = useState<DocInfo[]>([]);
  const [loadingFlg, setLoadingFlg] = useState<boolean>(false);

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
          <table className="table table-sm table-bordered">
            <thead className="table-light">
              <tr>
                <th scope="col">日時</th>
                <th scope="col">画</th>
                <th scope="col">題名</th>
              </tr>
            </thead>
            <tbody>
              {
                docList.map(record => {
                  return (
                    <tr key={record.id}>
                      <td>{record.datetime}</td>
                      <td>{record.images}</td>
                      <td>{record.title}</td>
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
}

export default App;
