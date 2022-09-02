class IDB{constructor(e,t,r,s){const a=this._argsCheck({name:{value:e,required:!0,type:"string"},version:{value:t,required:!0,type:"number"},objectStores:{value:r,required:!0,type:"array"},options:{value:s,type:"object"}}),i=`[IDB] new IDB(${e||"_"}, ...) call ruined due to `;return a.passed?(this.showLogs=!s||!0!==s.hideLogs,this._listeners={},this._idb=indexedDB.open(e,t),this._idb.addEventListener("upgradeneeded",(()=>this._upgradeneeded(r))),this._idb.addEventListener("success",(()=>this._success())),this):this._proccessError(!0,i,a)}_upgradeneeded(e){this.showLogs&&console.log("[IDB] Database upgrading started"),this.db=this._idb.result;const t={};for(let r of e){const e=this._argsCheck({storeName:{value:r.name,required:!0,type:"string"},storeIndex:{value:r.index,required:!0,type:"object"}}),s=`[IDB] While creating object store ${r.name||"_"} `,a=". Store is not created";e.passed?(this.db.objectStoreNames.contains(r.name)||this.db.createObjectStore(r.name,r.index),t[r.name]=!0):this._proccessError(!1,s,e,a)}for(let e of this.db.objectStoreNames)t[e]||this.db.deleteObjectStore(e)}_success(){this.showLogs&&console.log("[IDB] Database successfully opened"),this.db=this._idb.result,this.db.addEventListener("versionchange",(()=>this._versionchange()))}_versionchange(){this.db.close(),this._closedDueToVersionChange=!0,console.error("[IDB] Database closed due to version change, reload page")}async _isDbReady(){return!this._closedDueToVersionChange&&(this.db||await new Promise((e=>{const t=()=>this.db?e():setTimeout(t,5);t()})),!0)}_err(e,t){return`[IDB] Error in db.${e}(${t||" "}): `}_checkStore(e,t){return!!this.db.objectStoreNames.contains(t)||(console.error(`${this._err(e)}database haven't "${t}" store`),!1)}_proccessError(e,t,r,s=""){const a=e?"error":"warn",{errorType:i,argName:n,arg:o}=r,l=`waiting for ${n} argument `,u="but receives ";if("noValue"==i)return console[a](`${t}${l}${u}nothing${s}`);const c=o.value;return"wrongType"==i?console[a](`${t}${l}type ${c.type} ${u}type ${typeof c.value}: ${c.value}`):void 0}_argsCheck(e){for(let t in e){const r=e[t];if(!r.required&&!r.value)continue;if(r.required&&!r.value)return{errorType:"noValue",argName:t};let s=!1;if(r.type&&"array"==r.type?Array.isArray(r.value)||(s=!0):r.type&&typeof r.value!==r.type&&(s=!0),s)return{errorType:"wrongType",argName:t,arg:r}}return{passed:!0}}_dataOperationsArgsCheck(e,t){let r=null;"store"in t&&(r=t.store.value,Object.assign(t.store,{required:!0,type:"string"}));const s=this._argsCheck(t);return!!s.passed||this._proccessError(!0,this._err(e,r),s)}async _dbCall(e,t,r,s,a,i,n){if(!this._dataOperationsArgsCheck(e,t))return;if(!await this._isDbReady())return;const o=t.store.value;if(!this._checkStore(e,o))return;const l=this.db.transaction(o,r).objectStore(o)[s](a);return new Promise((e=>{l.addEventListener("success",(async()=>{if(!n||await n(l.result)){const t=i?await i(l.result):null;e(t)}}))}))}async _onDataUpdateCall(e,t){e in this._listeners&&await Promise.all(this._listeners[e].map((async r=>await r(e,t))))}async setItem(e,t){return await this._dbCall("setItem",{store:{value:e},item:{value:t,required:!0,type:"object"}},"readwrite","put",t,(async()=>await this._onDataUpdateCall(e,t)))}async getItem(e,t){return await this._dbCall("getItem",{store:{value:e},itemKey:{value:t,required:!0}},"readonly","get",t,(e=>e))}async updateItem(e,t,r){if(!this._dataOperationsArgsCheck("updateItem",{store:{value:e},itemKey:{value:t,required:!0},updateCallback:{value:r,required:!0,type:"function"}}))return;const s=await this.getItem(e,t);return await r(s),await this.setItem(e,s),s}async getAll(e,t){const r=[],s=await this._dbCall("getAll",{store:{value:e},onData:{value:t,type:"function"}},"readonly","openCursor",null,(()=>r),(async e=>{if(!e)return!0;{const s=e.value,a=r.length;r.push(s),t&&t(s,a),e.continue()}}));return s?r:s}async deleteItem(e,t){return await this._dbCall("deleteItem",{store:{value:e},itemKey:{value:t,required:!0}},"readwrite","delete",t,(async()=>await this._onDataUpdateCall(e)))}async deleteAll(e){return await this._dbCall("deleteAll",{store:{value:e}},"readwrite","clear",null,(async()=>await this._onDataUpdateCall(e)))}async hasItem(e,t){return await this._dbCall("hasItem",{store:{value:e}},"readonly","count",t,(e=>t?1==e:e))}async onDataUpdate(e,t){if(!this._dataOperationsArgsCheck("updateItem",{store:{value:e},callback:{value:t,required:!0,type:"function"}}))return;return await this._isDbReady()&&this._checkStore("onDataUpdate",e)?(e in this._listeners||(this._listeners[e]=[]),this._listeners[e].push(t),this):void 0}}export{IDB};
