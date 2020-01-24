import React, { useState, useEffect } from 'react';
import 'App.css';
import Dexie from 'dexie';

const SERVER_PATH = window.location.port === '3001'
  ? 'http://127.0.0.1:8080'
  : window.location.protocol + '//' + window.location.host;

interface DocInfo {
  title: string;
  id: number;
  datetime: string;
  images: number;
  message: string;
}

const db = new Dexie("friend_database");
db.version(1).stores({
  images: 'apiKey,imageData'
});

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

const getDocKey = (docInfo: DocInfo) => {
  if (['ケルンの衝撃', '新たなるニコン', 'キヤノンの逆襲', 'パナソニックの帰還', 'ライカの脅威',
    'ツァイスの攻撃', 'フジの復讐', 'シグマの覚醒', 'グレイテストの時代']
    .includes(docInfo.title)) {
    return 'フォトキナ2018';
  }
  if (docInfo.title.includes('EOSの目覚め')) {
    return 'EOSの目覚め';
  }
  if (docInfo.title.includes('私を海に連れてって')) {
    return 'わたしを海につれてって';
  }
  if (docInfo.title.includes('ストロボの灯りがとてもきれいなCP+')) {
    return 'ストロボの明かりがとてもきれいなCP+';
  }
  if (docInfo.title.includes('新しいカメラは新しいカメラバックに盛れ')) {
    return '新しいカメラは新しいカメラバッグに盛れ';
  }
  if (docInfo.title.includes('エレガント') && docInfo.title.includes('な')) {
    return 'ニコンヌーヴォー';
  }
  const kakkoIndex = docInfo.title.indexOf('（');
  if (kakkoIndex >= 0) {
    return docInfo.title.substring(0, kakkoIndex);
  }
  return docInfo.title;
};

const calcDocTree = (docList: DocInfo[]): { key: string, list: DocInfo[] }[] => {
  const result: { key: string, list: DocInfo[] }[] = [];
  for (const docInfo of docList) {
    const key = getDocKey(docInfo);
    let flg = false;
    for (const resultRecord of result) {
      if (resultRecord.key === key) {
        resultRecord.list.push(docInfo);
        flg = true;
        break;
      }
    }
    if (!flg) {
      result.push({ key, list: [docInfo] });
    }
  }
  return result;
};

const loadImageUrl = async (id: number, index: number) => {
  const cacheKey = `docs/${id}/images/${index}`;
  const cacheDataList = await (db as any).images.where('apiKey').equals(cacheKey).toArray();
  if (cacheDataList.length > 0) {
    return JSON.parse(cacheDataList[0]['imageData']);
  }
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = async () => {
      if (JSON.stringify(fr.result).length >= 10) {
        try {
          await (db as any).images.put({ apiKey: cacheKey, imageData: JSON.stringify(fr.result) });
        } catch {
          console.error('IndexedDBの容量制限に引っかかりました.');
        }
      } else {
        // 読み込みエラー
        console.error(`画像「${cacheKey}」が正常に読み込めていません.`);
      }
      resolve(fr.result as string);
    };
    fetch(SERVER_PATH + `/api/docs/${id}/images/${index}`)
      .then(data => data.blob())
      .then(blob => fr.readAsDataURL(blob));
  });
};

type ViewMode = 'DocList' | 'DocView';

const App: React.FC = () => {
  const [docList, setDocList] = useState<DocInfo[]>([]);
  const [docTree, setDocTree] = useState<{ key: string, list: DocInfo[] }[]>([]);
  const [loadingFlg, setLoadingFlg] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('DocList');
  const [treeFlg, setTreeFlg] = useState(false);
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
    setDocTree(calcDocTree(docList));
  }, [docList]);

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

  const onClickDoc = async (doc: DocInfo) => {
    setDocInfo({ ...doc });
    setImageUrlList([]);
    const newImageUrlList: string[] = [];
    for (let i = 1; i <= doc.images; i++) {
      newImageUrlList.push(await loadImageUrl(doc.id, i));
    }
    setImageUrlList(newImageUrlList);
    setViewMode('DocView');
  };

  const backToDocList = () => {
    setViewMode('DocList');
  }

  const backPage = () => {
    if (treeFlg) {
      for (let i = 0; i < docTree.length; i += 1) {
        for (let j = 0; j < docTree[i].list.length; j += 1) {
          if (docTree[i].list[j].id === docInfo.id) {
            if (j > 0) {
              onClickDoc(docTree[i].list[j - 1]);
            } else if (i > 0){
              onClickDoc(docTree[i - 1].list[docTree[i - 1].list.length - 1]);
            }
          }
        }
      }
    } else {
      const index = docList.findIndex(record => record.id === docInfo.id);
      if (index >= 1) {
        onClickDoc(docList[index - 1]);
      }
    }
  };

  const nextPage = () => {
    if (treeFlg) {
      for (let i = 0; i < docTree.length; i += 1) {
        for (let j = 0; j < docTree[i].list.length; j += 1) {
          if (docTree[i].list[j].id === docInfo.id) {
            if (j < docTree[i].list.length - 1) {
              onClickDoc(docTree[i].list[j + 1]);
            } else if (i < docTree.length - 1){
              onClickDoc(docTree[i + 1].list[0]);
            }
          }
        }
      }
    } else {
      const index = docList.findIndex(record => record.id === docInfo.id);
      if (index < docList.length - 1) {
        onClickDoc(docList[index + 1]);
      }
    }
  };

  switch (viewMode) {
    case 'DocList':
      if (treeFlg) {
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
                      : <button type="button" className="btn btn-primary" onClick={upDateDocList}>ツリーを更新</button>
                  }
                  <button type="button" className="btn btn-secondary ml-3" onClick={() => setTreeFlg(false)}>一覧表示にする</button>
                </form>
              </div>
            </div>
            <div className="row">
              <div className="col my-3">
                <div className="accordion" id="accordion" role="tablist" aria-multiselectable="true">
                  {
                    docTree.map(record => {
                      return (<>
                        <details key={record.key}>
                          <summary>[{record.list.length}件] {record.key}</summary>
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
                                record.list.map((record2) => {
                                  return (
                                    <tr key={record2.id}>
                                      <td className="doc-button p-1 align-middle">
                                        <button className="doc-button" onClick={() => onClickDoc(record2)}>
                                          {record2.title}
                                        </button>
                                      </td>
                                      <td>{record2.datetime}</td>
                                      <td>{record2.images}</td>
                                    </tr>
                                  );
                                })
                              }
                            </tbody>
                          </table>
                        </details>
                      </>);
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        );
      } else {
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
                      : <button type="button" className="btn btn-primary" onClick={upDateDocList}>一覧を更新</button>
                  }
                  <button type="button" className="btn btn-secondary ml-3" onClick={() => setTreeFlg(true)}>ツリー表示にする</button>
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
                      docList.map((record) => {
                        return (
                          <tr key={record.id}>
                            <td className="doc-button p-1 align-middle">
                              <button className="doc-button" onClick={() => onClickDoc(record)}>
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
      }
    case 'DocView':
      return (
        <div className="container">
          <div className="row">
            <div className="col my-3">
              <span className="text-center"><strong>{docInfo.title}</strong></span><br/>
              <span className="text-center">{docInfo.datetime}</span>
            </div>
          </div>
          <div className="row">
            <div className="col my-3 text-center">
              <button type="button" className="btn btn-secondary mt-3 btn-sm" onClick={backPage}>←</button>
              <button type="button" className="btn btn-primary mt-3 btn-sm mx-3" onClick={backToDocList}>リストに戻る</button>
              <button type="button" className="btn btn-secondary mt-3 btn-sm" onClick={nextPage}>→</button>
            </div>
          </div>
          <div className="row">
            <div className="col col-md-6 my-3 mx-auto">
              <span className="text-center"><strong>【本編】</strong></span>
              {
                imageUrlList.length > 0
                  ? imageUrlList.map((url, index) => {
                    return (<div key={index}>
                      <img className="w-100 p-3" alt={'' + index} src={url} />
                    </div>);
                  })
                  : <>
                    <br />
                    <div className="spinner-border" role="status">
                      <span className="sr-only">読込中……</span>
                    </div>
                    <br />
                  </>
              }
              <span className="text-center"><strong>【解説】</strong></span>
              <pre className="doc-message">{docInfo.message}</pre>
            </div>
          </div>
          <div className="row">
            <div className="col my-3 text-center">
              <button type="button" className="btn btn-secondary mt-3 btn-sm" onClick={backPage}>←</button>
              <button type="button" className="btn btn-primary mt-3 btn-sm mx-3" onClick={backToDocList}>リストに戻る</button>
              <button type="button" className="btn btn-secondary mt-3 btn-sm" onClick={nextPage}>→</button>
            </div>
          </div>
        </div>
      );
  }
}

export default App;
