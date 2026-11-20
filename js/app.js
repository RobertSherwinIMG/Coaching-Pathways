(function(){
  var META={"l2": {"short": "Tier 2", "cmin": 1, "imin": 2, "label": "Tier 2: Golf Coach", "exp": "1–5 years coaching experience and 2 years at IMG Academy"}, "l3": {"short": "Tier 3 Coach", "cmin": 3, "imin": 4, "label": "Tier 3: Coach", "exp": "3–7 years coaching experience and 4 years at IMG Academy"}, "lead": {"short": "Tier 3 Lead", "cmin": 7, "imin": 4, "label": "Tier 3: Lead", "exp": "7+ years coaching experience and 4 years at IMG Academy"}, "l4": {"short": "Tier 4 Specialist", "cmin": 10, "imin": 7, "label": "Tier 4: Specialist", "exp": "10+ years coaching experience and 7+ years at IMG Academy"}};
  var $=function(s,r){return (r||document).querySelector(s)};
  var all=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  function stats(root){var n=0,sum=0,ass=0,std=0;all('select.rate',root).forEach(function(s){n++;var v=Number(s.value);if(v>=1){ass++;sum+=v}if(v>=3)std++;});return{n:n,sum:sum,ass:ass,std:std};}
  var res={};
  function update(){
    all('select.rate').forEach(function(s){s.dataset.v=s.value;});
    all('details.dd').forEach(function(d){var v=all('input:checked',d).map(function(i){return i.value});$('.mlist',d).textContent=v.length?v.join('; '):'none selected';});
    all('.lvl').forEach(function(lv){
      var id=lv.dataset.level,t={n:0,sum:0,ass:0,std:0};
      all('tr[data-s]',lv).forEach(function(tr){var g=$('.grp[data-g="'+tr.dataset.s+'"]',lv),s=stats(g);
        $('.avg',tr).textContent=s.ass?(s.sum/s.ass).toFixed(1):'–';$('.std',tr).textContent=s.std+' of '+s.n;
        t.n+=s.n;t.sum+=s.sum;t.ass+=s.ass;t.std+=s.std;
        var m=$('.meta',g);});
      var tr=$('tr[data-all]',lv);$('.avg',tr).textContent=t.ass?(t.sum/t.ass).toFixed(1):'–';$('.std',tr).textContent=t.std+' of '+t.n;
      res[id]=t;t.met=t.n>0&&t.ass===t.n&&t.std===t.n;
      var sg=$('[data-sugg]',lv),txt;
      if(t.ass===0)txt='No criteria rated yet.';else if(t.ass<t.n)txt=(t.n-t.ass)+' criteria are not yet assessed.';else if(t.met)txt='Every criterion is rated 3 or 4, so the tier can be recognized.';else txt=(t.n-t.std)+' of '+t.n+' criteria are below the standard. Strengths in other areas do not offset them.';
      sg.innerHTML='<strong>Suggested from the ratings:</strong> '+txt;
      
    });
  }
  function expNote(){
    var id=$('#level').value,m=META[id],cy=parseFloat($('#cy').value),iy=parseFloat($('#iy').value),t='Expected experience for '+m.label+': '+m.exp+'. ';
    if(!isNaN(cy)&&!isNaN(iy)){var low=[];if(cy<m.cmin)low.push('coaching experience');if(iy<m.imin)low.push('time at IMG Academy');
      t+=low.length?'<strong>Below the expected '+low.join(' and ')+'.</strong> Competence decides; experience alone does not establish readiness.':'<strong>At or above the expected experience.</strong> Competence still decides.';}
    else t+='Enter years to compare.';
    $('#expNote').innerHTML=t;
  }
  function setLevel(id){
    document.body.dataset.level=id;
    all('.lvl').forEach(function(l){l.classList.toggle('on',l.dataset.level===id)});
    $('#level').value=id;
    expNote();
  }
  $('#level').addEventListener('change',function(e){setLevel(e.target.value);saveSel()});
  ['cy','iy'].forEach(function(i){$('#'+i).addEventListener('input',function(){expNote();saveSel()})});
  document.addEventListener('change',update);
  document.addEventListener('click',function(e){var d=e.target.closest&&e.target.closest('details.dd');all('details.dd[open]').forEach(function(x){if(x!==d)x.open=false});});
  var opened=[];
  function pa(){document.body.classList.add('printall');opened=all('details.guide').filter(function(d){return !d.open});opened.forEach(function(d){d.open=true});}
  function done(){document.body.classList.remove('printall','printone');opened.forEach(function(d){d.open=false});opened=[]}
  $('#printOne').addEventListener('click',function(){document.body.classList.add('printone');window.print();setTimeout(done,500)});
  $('#printAll').addEventListener('click',function(){pa();window.print();setTimeout(done,500)});
  window.addEventListener('afterprint',done);
  /* Database connection (Supabase REST). Settings come from js/config.js. Without them the page keeps working in this browser only. */
  var cfg=window.PATHWAY_CONFIG||{};
  var DB=!!(cfg.supabaseUrl&&cfg.supabaseKey&&String(cfg.supabaseUrl).indexOf('PASTE')<0&&String(cfg.supabaseKey).indexOf('PASTE')<0);
  function api(method,path,body,prefer){
    var h={'apikey':cfg.supabaseKey,'Content-Type':'application/json'};if(prefer)h.Prefer=prefer;
    return fetch(String(cfg.supabaseUrl).replace(/\/+$/,'')+'/rest/v1/'+path,{method:method,headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
      if(!r.ok)return r.text().then(function(t){var e=new Error('HTTP '+r.status);e.detail=t;throw e});
      return r.status===204?null:r.text().then(function(t){return t?JSON.parse(t):null});
    });
  }
  function setStatus(t){var s=$('#dbStatus');if(s)s.textContent=t}
  function fromRow(r){return {id:r.id,name:r.name,cy:r.years_coaching==null?'':Number(r.years_coaching),iy:r.years_img==null?'':Number(r.years_img),tier:r.current_tier||''}}
  function toRow(k,r){var c=k==='coaches';return {role:c?'coach':'assessor',name:r.name,current_tier:c&&r.tier?r.tier:null,years_coaching:c&&r.cy!==''?r.cy:null,years_img:c&&r.iy!==''?r.iy:null}}
  /* Coaches and assessors (database when connected, otherwise this browser's localStorage) */
  var PK='cp.people.v1',SK='cp.sel.v1',people={coaches:[],assessors:[]},kind='coaches',editId=null;
  function lget(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
  function lset(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  var pp=DB?null:lget(PK);if(pp&&pp.coaches&&pp.assessors)people=pp;
  function savePeople(){if(!DB)lset(PK,people)}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function find(k,id){return people[k].filter(function(p){return p.id===id})[0]}
  function fillSel(sel,k,ph){
    var cur=sel.value;sel.innerHTML='';
    var o=document.createElement('option');o.value='';o.textContent=people[k].length?ph:'No '+k+' yet. Use + to add';sel.appendChild(o);
    people[k].slice().sort(function(a,b){return a.name.localeCompare(b.name)}).forEach(function(p){var x=document.createElement('option');x.value=p.id;x.textContent=p.name;sel.appendChild(x)});
    sel.value=find(k,cur)?cur:'';
  }
  function fillBoth(){fillSel($('#coach'),'coaches','Select a coach');fillSel($('#assessor'),'assessors','Select an assessor or director')}
  function saveSel(){lset(SK,{coach:$('#coach').value,assessor:$('#assessor').value,level:$('#level').value,cy:$('#cy').value,iy:$('#iy').value,adate:$('#adate').value})}
  function applyCoach(){var c=find('coaches',$('#coach').value);$('#cy').value=c&&c.cy!==''?c.cy:'';$('#iy').value=c&&c.iy!==''?c.iy:'';if(c&&c.tier&&META[c.tier])setLevel(c.tier);else expNote()}
  $('#coach').addEventListener('change',function(){applyCoach();saveSel()});
  $('#assessor').addEventListener('change',saveSel);
  $('#adate').addEventListener('change',saveSel);
  var dlg=$('#peopleDlg');
  function resetForm(){editId=null;$('#pName').value='';$('#pCy').value='';$('#pIy').value='';$('#pTier').value='';$('#pMsg').textContent='';$('#pFormTitle').textContent='Add '+(kind==='coaches'?'coach':'assessor');$('#pCancel').style.display='none'}
  function renderList(){
    var ul=$('#pList');ul.innerHTML='';
    if(!people[kind].length){var e=document.createElement('li');e.className='empty';e.textContent='None added yet.';ul.appendChild(e)}
    people[kind].slice().sort(function(a,b){return a.name.localeCompare(b.name)}).forEach(function(p){
      var li=document.createElement('li'),n=document.createElement('span'),y=document.createElement('span'),eb=document.createElement('button'),db=document.createElement('button');
      n.className='nm';n.textContent=p.name;y.className='yr';y.textContent=kind==='coaches'?(p.cy===''?'–':p.cy)+' yrs coaching, '+(p.iy===''?'–':p.iy)+' yrs IMG'+(p.tier&&META[p.tier]?', '+META[p.tier].label:''):'';
      eb.type=db.type='button';eb.textContent='Edit';db.textContent='Delete';
      eb.addEventListener('click',function(){editId=p.id;$('#pName').value=p.name;$('#pCy').value=p.cy;$('#pIy').value=p.iy;$('#pTier').value=p.tier||'';$('#pFormTitle').textContent='Edit '+p.name;$('#pCancel').style.display='';$('#pMsg').textContent='';$('#pName').focus()});
      db.addEventListener('click',function(){
        if(!window.confirm('Delete '+p.name+'?'))return;
        var k=kind;
        (DB?api('DELETE','pathway_people?id=eq.'+encodeURIComponent(p.id)):Promise.resolve()).then(function(){
          people[k]=people[k].filter(function(x){return x.id!==p.id});savePeople();
          if(editId===p.id)resetForm();
          var wasCoach=k==='coaches'&&$('#coach').value===p.id;
          fillBoth();if(wasCoach)applyCoach();saveSel();renderList();
        }).catch(function(){$('#pMsg').textContent='Could not delete '+p.name+'. They may have saved assessments, or the database is unreachable.'});
      });
      li.appendChild(n);li.appendChild(y);li.appendChild(eb);li.appendChild(db);ul.appendChild(li);
    });
  }
  function showKind(k){kind=k;all('.pyears').forEach(function(f){f.style.display=k==='coaches'?'':'none'});all('.seg button').forEach(function(b){b.classList.toggle('on',b.dataset.kind===k)});resetForm();renderList()}
  all('.seg button').forEach(function(b){b.addEventListener('click',function(){showKind(b.dataset.kind)})});
  $('#manageBtn').addEventListener('click',function(){showKind(kind);if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')});
  $('#pClose').addEventListener('click',function(){dlg.close()});
  $('#pCancel').addEventListener('click',resetForm);
  function num(v){var n=parseFloat(v);return isNaN(n)?'':n}
  $('#pSave').addEventListener('click',function(){
    var name=$('#pName').value.trim();
    if(!name){$('#pMsg').textContent='Enter a name.';$('#pName').focus();return}
    var k=kind,existing=editId&&find(k,editId);
    var data={name:name};
    if(k==='coaches'){data.cy=num($('#pCy').value);data.iy=num($('#pIy').value);data.tier=$('#pTier').value}
    var work;
    if(!DB)work=Promise.resolve(existing?existing.id:uid());
    else if(existing)work=api('PATCH','pathway_people?id=eq.'+encodeURIComponent(existing.id),toRow(k,data)).then(function(){return existing.id});
    else work=api('POST','pathway_people',toRow(k,data),'return=representation').then(function(r){return r[0].id});
    $('#pSave').disabled=true;
    work.then(function(id){
      var rec=existing;
      if(rec){rec.name=data.name;if(k==='coaches'){rec.cy=data.cy;rec.iy=data.iy;rec.tier=data.tier}}
      else{rec={id:id,name:data.name};if(k==='coaches'){rec.cy=data.cy;rec.iy=data.iy;rec.tier=data.tier}people[k].push(rec)}
      savePeople();fillBoth();
      if(k==='coaches'&&$('#coach').value===rec.id)applyCoach();
      saveSel();resetForm();renderList();$('#pMsg').textContent='Saved.';
    }).catch(function(){$('#pMsg').textContent='Could not save. Check the connection and try again.'}).then(function(){$('#pSave').disabled=false});
  });
  $('#pName').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('#pSave').click()}});
  /* Save the assessment to the database */
  var curId=null,curKey='';
  function akey(){return [$('#coach').value,$('#assessor').value,$('#level').value,$('#adate').value].join('|')}
  function collect(){
    var lv=$('.lvl.on'),rows=[];
    all('.crit',lv).forEach(function(cr,i){
      var sec=cr.closest('.sect'),h=$('h2',sec).textContent.replace(/^Section\s+\d+:\s*/,''),sn=parseInt(($('h2',sec).textContent.match(/^Section\s+(\d+)/)||[0,0])[1],10);
      var sub=null,p=cr.previousElementSibling;while(p){if(p.tagName==='H3'){sub=p.textContent.trim();break}p=p.previousElementSibling}
      rows.push({question_no:i+1,section_no:sn,section:h,subsection:sub,question:$('.tx span:last-child',cr).textContent,rating:Number($('select.rate',cr).value)||0,evidence:$('textarea',cr).value.trim()||null});
    });
    return rows;
  }
  function saveMsg(t){var m=$('#saveMsg');if(m)m.textContent=t}
  $('#saveAssess').addEventListener('click',function(){
    if(!DB){saveMsg('The database is not connected yet. Add the project URL and key in js/config.js.');return}
    if(!$('#coach').value||!$('#assessor').value||!$('#adate').value){saveMsg('Choose a coach, an assessor and an assessment date first.');return}
    var k=akey();if(k!==curKey){curId=null}
    var head={coach_id:$('#coach').value,assessor_id:$('#assessor').value,tier:$('#level').value,assessment_date:$('#adate').value,years_coaching:num($('#cy').value)===''?null:num($('#cy').value),years_img:num($('#iy').value)===''?null:num($('#iy').value)};
    var btn=$('#saveAssess');btn.disabled=true;saveMsg('Saving...');
    var step=curId?api('PATCH','pathway_assessments?id=eq.'+encodeURIComponent(curId),head).then(function(){return curId}):api('POST','pathway_assessments',head,'return=representation').then(function(r){return r[0].id});
    step.then(function(id){
      curId=id;curKey=k;
      var rows=collect().map(function(r){r.assessment_id=id;return r});
      return api('POST','pathway_assessment_scores?on_conflict=assessment_id,question_no',rows,'resolution=merge-duplicates,return=minimal');
    }).then(function(){saveMsg('Assessment saved at '+new Date().toLocaleTimeString()+'.')})
    .catch(function(){saveMsg('Could not save the assessment. Check the connection and try again.')})
    .then(function(){btn.disabled=false});
  });
  /* restore saved selections */
  function boot(){
    fillBoth();
    var sv=lget(SK)||{};
    if(sv.coach&&find('coaches',sv.coach))$('#coach').value=sv.coach;
    if(sv.assessor&&find('assessors',sv.assessor))$('#assessor').value=sv.assessor;
    if(sv.adate)$('#adate').value=sv.adate;
    $('#cy').value=sv.cy||'';$('#iy').value=sv.iy||'';
    setLevel(META[sv.level]?sv.level:'l2');update();
  }
  boot();
  if(DB){
    setStatus('Connecting to the database...');
    api('GET','pathway_people?select=*&order=name').then(function(rows){
      people={coaches:[],assessors:[]};
      rows.forEach(function(r){(r.role==='coach'?people.coaches:people.assessors).push(fromRow(r))});
      boot();setStatus('Connected to the database.');
    }).catch(function(){setStatus('Could not reach the database. Coaches and assessors cannot be loaded or saved right now.')});
  }else setStatus('Not connected to the database. Coaches and assessors are saved in this browser only.');
})();
