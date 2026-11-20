(function(){
  var P=window.PATHWAY_APP;if(!P)return;
  var META=P.META,api=P.api,DB=P.DB;
  var TIERS=['l2','l3','lead','l4'];
  var RL=['Not assessed','Below standard','Developing','Meets the standard','Exceeds the standard'];
  var ST={'Passed':{c:'#0ca30c',g:'✓',ink:'#fff'},'Not yet':{c:'#d03b3b',g:'✕',ink:'#fff'},'Incomplete':{c:'#fab219',g:'…',ink:'#0b0b0b'}};
  var ORDER=['Passed','Not yet','Incomplete'];
  var BLUE='#2a78d6';
  var NS='http://www.w3.org/2000/svg';
  var $=function(s,r){return (r||document).querySelector(s)};

  /* ---------- tiny DOM helpers (all text goes in through textContent) ---------- */
  function mk(tag,attrs,kids,svg){
    var e=svg?document.createElementNS(NS,tag):document.createElement(tag);
    if(attrs)for(var k in attrs){if(attrs[k]==null)continue;if(k==='text')e.textContent=attrs[k];else if(k==='class')e.setAttribute('class',attrs[k]);else e.setAttribute(k,attrs[k])}
    (kids||[]).forEach(function(c){if(c==null)return;e.appendChild(typeof c==='string'?document.createTextNode(c):c)});
    return e;
  }
  function sv(tag,attrs,kids){return mk(tag,attrs,kids,true)}
  function fdate(d){if(!d)return '';var p=String(d).split('-');return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:d}
  function f1(n){return n==null?'–':n.toFixed(1)}
  function tierName(t){return META[t]?META[t].label:'Not set'}

  /* ---------- load and shape the data ---------- */
  var D={people:[],recs:[]},tab='overview',tierSel='l2';
  function fetchAll(path){
    var out=[];
    function next(off){return api('GET',path+'&limit=1000&offset='+off).then(function(r){out=out.concat(r);return r.length===1000?next(off+1000):out})}
    return next(0);
  }
  function statusOf(n,rated,std){return rated<n?'Incomplete':(std===n?'Passed':'Not yet')}
  function build(people,assess,scores){
    var byId={};people.forEach(function(p){byId[p.id]=p});
    var rowsBy={};scores.forEach(function(s){(rowsBy[s.assessment_id]=rowsBy[s.assessment_id]||[]).push(s)});
    var recs=[];
    assess.forEach(function(a){
      var rows=rowsBy[a.id]||[];if(!rows.length)return;
      var n=rows.length,rated=0,std=0,sum=0,secs={};
      rows.forEach(function(r){
        var s=secs[r.section_no]=secs[r.section_no]||{no:r.section_no,name:r.section,n:0,rated:0,sum:0,std:0};
        s.n++;if(r.rating>=1){rated++;sum+=r.rating;s.rated++;s.sum+=r.rating}
        if(r.rating>=3){std++;s.std++}
      });
      recs.push({a:a,coach:byId[a.coach_id],assessor:byId[a.assessor_id],rows:rows,n:n,rated:rated,std:std,avg:rated?sum/rated:null,secs:secs,status:statusOf(n,rated,std)});
    });
    D.people=people;D.recs=recs;
  }
  function newer(x,y){var a=x.a.assessment_date,b=y.a.assessment_date;if(a!==b)return a>b;return x.a.created_at>y.a.created_at}
  function latestBy(list,keyFn){var m={};list.forEach(function(r){var k=keyFn(r);if(!m[k]||newer(r,m[k]))m[k]=r});return Object.keys(m).map(function(k){return m[k]})}
  function coaches(){return D.people.filter(function(p){return p.role==='coach'})}

  /* ---------- tooltip ---------- */
  var tip=mk('div',{class:'dtip',role:'tooltip'});tip.hidden=true;document.body.appendChild(tip);
  document.addEventListener('mouseover',function(e){var t=e.target.closest&&e.target.closest('#dash [data-tip]');if(!t){tip.hidden=true;return}tip.textContent=t.getAttribute('data-tip');tip.hidden=false});
  document.addEventListener('mousemove',function(e){if(tip.hidden)return;var x=e.clientX+14,y=e.clientY+16;if(x+tip.offsetWidth>window.innerWidth-8)x=e.clientX-tip.offsetWidth-14;tip.style.left=x+'px';tip.style.top=y+'px'});

  /* ---------- chart parts ---------- */
  function niceMax(m){var step=m<=5?1:Math.ceil(m/5);var top=Math.ceil(m/step)*step;var t=[];for(var i=0;i<=top;i+=step)t.push(i);return t}
  function colChart(cats,o){
    var W=520,H=270,L=36,R=10,T=18,B=48,pw=W-L-R,ph=H-T-B;
    var ticks=o.ticks||niceMax(Math.max(1,Math.max.apply(null,cats.map(function(c){return c.segs.reduce(function(a,s){return a+s.v},0)}))));
    var max=ticks[ticks.length-1];
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,class:'chart',role:'img','aria-label':o.aria});
    ticks.forEach(function(t){var y=T+ph-t/max*ph;svg.appendChild(sv('line',{x1:L,x2:W-R,y1:y,y2:y,class:t===0?'bl':'gl'}));svg.appendChild(sv('text',{x:L-8,y:y+4,class:'ax','text-anchor':'end',text:String(t)}))});
    var slot=pw/cats.length,bw=Math.min(64,slot*0.6);
    cats.forEach(function(c,i){
      var cx=L+slot*(i+.5),x=cx-bw/2,y0=T+ph,last=-1;
      c.segs.forEach(function(s,j){if(s.v>0)last=j});
      c.segs.forEach(function(s,j){
        if(s.v<=0)return;
        var h=s.v/max*ph,y=y0-h,tp=(o.tipFn?o.tipFn(c,s):c.label+' · '+s.name+': '+s.v);
        var a={fill:s.c,class:'mk','data-tip':tp};var node;
        if(j===last&&h>=8)node=sv('path',Object.assign({d:'M'+x+','+(y+h)+'L'+x+','+(y+4)+'Q'+x+','+y+' '+(x+4)+','+y+'L'+(x+bw-4)+','+y+'Q'+(x+bw)+','+y+' '+(x+bw)+','+(y+4)+'L'+(x+bw)+','+(y+h)+'Z'},a));
        else node=sv('rect',Object.assign({x:x,y:y,width:bw,height:h},a));
        svg.appendChild(node);
        if(o.top)svg.appendChild(sv('text',{x:cx,y:y-6,class:'vl','text-anchor':'middle',text:f1(s.v)}));
        else if(h>=16)svg.appendChild(sv('text',{x:cx,y:y+h/2+4,class:'vi','text-anchor':'middle',fill:s.ink||'#fff',text:String(s.v)}));
        y0=y;
      });
      var lines=c.label.split(': ');
      lines.forEach(function(ln,k){svg.appendChild(sv('text',{x:cx,y:H-B+18+k*14,class:'ax','text-anchor':'middle',text:ln}))});
    });
    if(o.ref){var ry=T+ph-o.ref.v/max*ph;svg.appendChild(sv('line',{x1:L,x2:W-R,y1:ry,y2:ry,class:'rf'}));svg.appendChild(sv('text',{x:W-R,y:ry-5,class:'ax','text-anchor':'end',text:o.ref.label}))}
    return svg;
  }
  function donut(parts){
    var S=170,c=S/2,r=62,sw=24,total=parts.reduce(function(a,p){return a+p.v},0);
    var svg=sv('svg',{viewBox:'0 0 '+S+' '+S,class:'donut',role:'img','aria-label':o_aria(parts,total)});
    var nz=parts.filter(function(p){return p.v>0}),a0=-Math.PI/2,g=nz.length>1?2/r:0;
    nz.forEach(function(p){
      var ang=p.v/total*Math.PI*2,tp=p.name+': '+p.v+' of '+total;
      if(nz.length===1){svg.appendChild(sv('circle',{cx:c,cy:c,r:r,fill:'none',stroke:p.c,'stroke-width':sw,'data-tip':tp,class:'mk2'}))}
      else{
        var s=a0+g/2,e=a0+ang-g/2,x0=c+r*Math.cos(s),y0=c+r*Math.sin(s),x1=c+r*Math.cos(e),y1=c+r*Math.sin(e);
        svg.appendChild(sv('path',{d:'M'+x0+','+y0+'A'+r+','+r+' 0 '+(ang-g>Math.PI?1:0)+' 1 '+x1+','+y1,fill:'none',stroke:p.c,'stroke-width':sw,'data-tip':tp,class:'mk2'}));
      }
      a0+=ang;
    });
    svg.appendChild(sv('text',{x:c,y:c+4,class:'dn','text-anchor':'middle',text:String(total)}));
    svg.appendChild(sv('text',{x:c,y:c+22,class:'ax','text-anchor':'middle',text:'coaches'}));
    return svg;
  }
  function o_aria(parts,total){return 'Share of coaches by latest result. '+parts.map(function(p){return p.name+' '+p.v}).join(', ')+'. Total '+total+'.'}
  function legend(parts){
    return mk('ul',{class:'leg'},parts.map(function(p){
      return mk('li',null,[mk('span',{class:'sw',style:'background:'+p.c+';color:'+(p.ink||'#fff'),text:p.g||''}),mk('span',{class:'ln',text:p.name}),mk('span',{class:'lv',text:String(p.v)})]);
    }));
  }
  function hBars(items,color,empty){
    if(!items.length)return mk('p',{class:'note',text:empty||'Nothing to show yet.'});
    var max=Math.max.apply(null,items.map(function(i){return i.v}))||1;
    return mk('div',{class:'hb'},items.map(function(i){
      return mk('div',{class:'hr','data-tip':i.tip||(i.label+': '+i.text)},[
        mk('div',{class:'hl',text:i.label}),
        mk('div',{class:'ht'},[mk('div',{class:'hf',style:'width:'+Math.max(2,i.v/max*100)+'%;background:'+color})]),
        mk('div',{class:'hv',text:i.text})]);
    }));
  }
  function badge(status){
    if(!ST[status])return mk('span',{class:'bd',text:status||'Not assessed'});
    return mk('span',{class:'bd'},[mk('i',{style:'background:'+ST[status].c+';color:'+ST[status].ink,text:ST[status].g}),status]);
  }
  function tile(label,value,sub,status){
    return mk('div',{class:'tile'},[mk('div',{class:'tl'},[status?badge(status):label]),mk('div',{class:'tv',text:String(value)}),sub?mk('div',{class:'ts',text:sub}):null]);
  }
  function card(title,body,note,span){
    return mk('section',{class:'card'+(span?' wide':'')},[mk('h3',{text:title}),note?mk('p',{class:'note',text:note}):null].concat(body));
  }

  /* ---------- sortable table ---------- */
  function table(cols,rows,opts){
    opts=opts||{};var sortI=opts.sort==null?-1:opts.sort,dir=1;
    var wrap=mk('div',{class:'tw'});
    function draw(){
      wrap.textContent='';
      var data=rows.slice();
      if(sortI>=0){var c=cols[sortI];data.sort(function(a,b){var x=c.v(a),y=c.v(b);if(x===y)return 0;if(x==null)return 1;if(y==null)return -1;return (x<y?-1:1)*dir})}
      var hr=mk('tr');
      cols.forEach(function(c,i){
        var b=mk('button',{type:'button',class:'sortb',text:c.h+(i===sortI?(dir>0?' ▲':' ▼'):'')});
        b.addEventListener('click',function(){if(sortI===i)dir=-dir;else{sortI=i;dir=1}draw()});
        hr.appendChild(mk('th',{scope:'col'},[b]));
      });
      var tb=mk('tbody');
      data.forEach(function(r){
        var tr=mk('tr');
        cols.forEach(function(c){var td=mk('td');var v=c.r?c.r(r):c.v(r);if(v&&v.nodeType)td.appendChild(v);else td.textContent=(v==null||v==='')?'–':String(v);tr.appendChild(td)});
        if(opts.detail){
          tr.className='clk';tr.tabIndex=0;var dr=null;
          var tog=function(){if(dr){dr.parentNode.removeChild(dr);dr=null;tr.classList.remove('open')}else{dr=mk('tr',{class:'drow'},[mk('td',{colspan:cols.length},[opts.detail(r)])]);tr.parentNode.insertBefore(dr,tr.nextSibling);tr.classList.add('open')}};
          tr.addEventListener('click',tog);
          tr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();tog()}});
        }
        tb.appendChild(tr);
      });
      wrap.appendChild(mk('table',{class:'dt'},[mk('thead',null,[hr]),tb]));
    }
    draw();return wrap;
  }

  /* ---------- Overview tab ---------- */
  function counts(list){var c={'Passed':0,'Not yet':0,'Incomplete':0};list.forEach(function(r){c[r.status]++});return c}
  function renderOverview(){
    var root=$('#dOverview');root.textContent='';
    var all=coaches(),latest=latestBy(D.recs,function(r){return r.a.coach_id}),c=counts(latest);
    if(!latest.length){root.appendChild(mk('p',{class:'note',text:'No assessments have been saved yet. Save an assessment from the form and it will appear here.'}));return}
    root.appendChild(mk('div',{class:'kpis'},[
      tile('Coaches assessed',latest.length,'of '+all.length+' coaches added'),
      tile('',c['Passed'],'latest assessment at standard','Passed'),
      tile('',c['Not yet'],'one or more criteria below 3','Not yet'),
      tile('',c['Incomplete'],'some criteria not yet rated','Incomplete')]));
    var cats=TIERS.map(function(t){var l=latest.filter(function(r){return r.a.tier===t}),k=counts(l);
      return {label:tierName(t),segs:ORDER.map(function(s){return {name:s,v:k[s],c:ST[s].c,ink:ST[s].ink}})}});
    var parts=ORDER.map(function(s){return {name:s,v:c[s],c:ST[s].c,g:ST[s].g,ink:ST[s].ink}});
    var passRate=TIERS.map(function(t){var l=latest.filter(function(r){return r.a.tier===t}),p=l.filter(function(r){return r.status==='Passed'}).length;return {label:tierName(t),v:l.length?p/l.length:0,text:l.length?p+' of '+l.length+' ('+Math.round(p/l.length*100)+'%)':'No assessments'}});
    var cur={};all.forEach(function(p){var k=p.current_tier||'none';cur[k]=(cur[k]||0)+1});
    var curItems=TIERS.concat(['none']).filter(function(k){return cur[k]}).map(function(k){return {label:k==='none'?'Not set':tierName(k),v:cur[k],text:String(cur[k])+(cur[k]===1?' coach':' coaches')}});
    root.appendChild(mk('div',{class:'cards'},[
      card('Latest result by tier assessed',[colChart(cats,{aria:'Coaches by tier assessed and result. '+cats.map(function(x){return x.label+': '+x.segs.map(function(s){return s.v+' '+s.name}).join(', ')}).join('. ')}),legend(parts)],'Each coach counted once, using their most recent assessment.'),
      card('Overall result',[mk('div',{class:'dwrap'},[donut(parts),legend(parts)])],'Share of assessed coaches by latest result.'),
      card('Pass rate by tier',[hBars(passRate,BLUE)],'Passed means every criterion is rated 3 or 4.'),
      card('Coaches by current tier',[hBars(curItems,BLUE,'No coaches added yet.')],'The tier each coach currently holds, from the coach list.')]));
    var rows=all.map(function(p){return {p:p,r:latest.filter(function(r){return r.a.coach_id===p.id})[0]||null}});
    root.appendChild(mk('section',{class:'card wide'},[mk('h3',{text:'All coaches'}),mk('p',{class:'note',text:'Select a column heading to sort.'}),table([
      {h:'Coach',v:function(x){return x.p.name.toLowerCase()},r:function(x){return x.p.name}},
      {h:'Current tier',v:function(x){return META[x.p.current_tier]?TIERS.indexOf(x.p.current_tier):9},r:function(x){return tierName(x.p.current_tier)}},
      {h:'Tier assessed',v:function(x){return x.r?TIERS.indexOf(x.r.a.tier):9},r:function(x){return x.r?tierName(x.r.a.tier):'–'}},
      {h:'Last assessed',v:function(x){return x.r?x.r.a.assessment_date:null},r:function(x){return x.r?fdate(x.r.a.assessment_date):'–'}},
      {h:'Assessor',v:function(x){return x.r&&x.r.assessor?x.r.assessor.name.toLowerCase():null},r:function(x){return x.r&&x.r.assessor?x.r.assessor.name:'–'}},
      {h:'Result',v:function(x){return x.r?ORDER.indexOf(x.r.status):9},r:function(x){return x.r?badge(x.r.status):badge('Not assessed')}},
      {h:'At standard',v:function(x){return x.r?x.r.std/x.r.n:null},r:function(x){return x.r?x.r.std+' of '+x.r.n:'–'}},
      {h:'Average',v:function(x){return x.r?x.r.avg:null},r:function(x){return x.r?f1(x.r.avg):'–'}}
    ],rows,{sort:0})]));
  }

  /* ---------- By tier tab ---------- */
  function gapNode(r){
    var gaps=r.rows.filter(function(x){return x.rating<3}).sort(function(a,b){return a.question_no-b.question_no});
    var box=mk('div',{class:'gaps'});
    box.appendChild(mk('h4',{text:r.coach?r.coach.name+': what is below the standard':'What is below the standard'}));
    if(!gaps.length){box.appendChild(mk('p',{class:'note',text:'Every criterion is rated 3 or 4.'}));return box}
    gaps.forEach(function(g){
      box.appendChild(mk('div',{class:'gap'},[
        mk('div',{class:'gh'},[mk('span',{class:'gs',text:'Section '+g.section_no+': '+g.section+(g.subsection?' · '+g.subsection:'')}),mk('span',{class:'gr',text:g.rating?g.rating+' – '+RL[g.rating]:'Not assessed'})]),
        mk('div',{class:'gq',text:g.question}),
        mk('div',{class:g.evidence?'ge':'ge none',text:g.evidence||'No evidence or comment recorded.'})]));
    });
    return box;
  }
  function renderTier(){
    var root=$('#dTier');root.textContent='';
    var sel=mk('select',{id:'dTierSel','aria-label':'Tier'},TIERS.map(function(t){var o=mk('option',{value:t,text:tierName(t)});if(t===tierSel)o.selected=true;return o}));
    sel.addEventListener('change',function(){tierSel=sel.value;renderTier()});
    root.appendChild(mk('label',{class:'f tsel'},['Tier',sel]));
    var list=latestBy(D.recs.filter(function(r){return r.a.tier===tierSel}),function(r){return r.a.coach_id});
    if(!list.length){root.appendChild(mk('p',{class:'note',text:'No assessments have been saved for '+tierName(tierSel)+' yet.'}));return}
    var c=counts(list);
    root.appendChild(mk('div',{class:'kpis'},[tile('Coaches assessed',list.length,'latest assessment each'),tile('',c['Passed'],'','Passed'),tile('',c['Not yet'],'','Not yet'),tile('',c['Incomplete'],'','Incomplete')]));
    var secMap={};list.forEach(function(r){Object.keys(r.secs).forEach(function(k){var s=r.secs[k];if(s.rated){var m=secMap[k]=secMap[k]||{no:s.no,name:s.name,sum:0,n:0};m.sum+=s.sum/s.rated;m.n++}})});
    var secs=Object.keys(secMap).map(function(k){return secMap[k]}).sort(function(a,b){return a.no-b.no});
    var cats=secs.map(function(s){return {label:s.name,segs:[{name:'Average',v:s.sum/s.n,c:BLUE}]}});
    var miss={};
    list.forEach(function(r){r.rows.forEach(function(x){if(x.rating<3){var m=miss[x.question_no]=miss[x.question_no]||{q:x,low:0,un:0};if(x.rating===0)m.un++;else m.low++}})});
    var missItems=Object.keys(miss).map(function(k){return miss[k]}).filter(function(m){return m.low>0}).sort(function(a,b){return b.low-a.low||a.q.question_no-b.q.question_no}).slice(0,8).map(function(m){
      return {label:m.q.question,v:m.low,text:m.low+(m.low===1?' coach':' coaches'),tip:'Section '+m.q.section_no+': '+m.q.section+' · '+m.low+' rated below 3'+(m.un?', '+m.un+' not yet assessed':'')};
    });
    root.appendChild(mk('div',{class:'cards'},[
      card('Average score by section',[cats.length?colChart(cats,{max:4,ticks:[0,1,2,3,4],top:true,ref:{v:3,label:'Standard (3)'},tipFn:function(ct,s){return ct.label+' · average '+f1(s.v)},aria:'Average score by section for '+tierName(tierSel)+'. '+cats.map(function(x){return x.label+' '+f1(x.segs[0].v)}).join(', ')}):mk('p',{class:'note',text:'No ratings yet.'})],'Mean of each coach’s section average, counting rated criteria only.'),
      card('Where coaches fall short',[hBars(missItems,'#d03b3b','No criteria are below the standard.')],'Criteria most often rated 1 or 2 across these coaches.')]));
    var secCols=secs.map(function(s){return {h:'S'+s.no+' '+s.name,v:function(r){var x=r.secs[s.no];return x&&x.rated?x.sum/x.rated:null},r:function(r){var x=r.secs[s.no];return x&&x.rated?f1(x.sum/x.rated):'–'}}});
    var cols=[
      {h:'Coach',v:function(r){return r.coach?r.coach.name.toLowerCase():''},r:function(r){return r.coach?r.coach.name:'–'}},
      {h:'Assessed',v:function(r){return r.a.assessment_date},r:function(r){return fdate(r.a.assessment_date)}},
      {h:'Assessor',v:function(r){return r.assessor?r.assessor.name.toLowerCase():null},r:function(r){return r.assessor?r.assessor.name:'–'}},
      {h:'Result',v:function(r){return ORDER.indexOf(r.status)},r:function(r){return badge(r.status)}},
      {h:'At standard',v:function(r){return r.std/r.n},r:function(r){return r.std+' of '+r.n}},
      {h:'Average',v:function(r){return r.avg},r:function(r){return f1(r.avg)}}
    ].concat(secCols).concat([{h:'Below standard',v:function(r){return r.n-r.std},r:function(r){return String(r.n-r.std)}}]);
    root.appendChild(mk('section',{class:'card wide'},[mk('h3',{text:tierName(tierSel)+': coaches'}),mk('p',{class:'note',text:'Select a row to see the criteria below the standard, with the evidence recorded. Select a heading to sort.'}),table(cols,list,{sort:0,detail:gapNode})]));
  }

  /* ---------- shell ---------- */
  function msg(t){$('#dMsg').textContent=t||''}
  function render(){
    $('#dOverview').hidden=tab!=='overview';$('#dTier').hidden=tab!=='tier';
    Array.prototype.forEach.call(document.querySelectorAll('.dtabs button'),function(b){b.classList.toggle('on',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)});
    if(tab==='overview')renderOverview();else renderTier();
  }
  function load(){
    if(!DB){msg('The database is not connected. Add the project URL and key in js/config.js to see the dashboard.');return}
    msg('Loading...');
    Promise.all([fetchAll('pathway_people?select=*&order=created_at'),fetchAll('pathway_assessments?select=*&order=created_at'),fetchAll('pathway_assessment_scores?select=*&order=assessment_id,question_no')])
      .then(function(r){build(r[0],r[1],r[2]);msg('');render()})
      .catch(function(){msg('Could not load the data. Check the connection and that sql/access.sql has been run.')});
  }
  $('#dashBtn').addEventListener('click',function(){document.body.classList.add('dashon');$('#dash').hidden=false;window.scrollTo(0,0);load()});
  $('#dBack').addEventListener('click',function(){document.body.classList.remove('dashon');$('#dash').hidden=true;window.scrollTo(0,0)});
  $('#dRefresh').addEventListener('click',load);
  Array.prototype.forEach.call(document.querySelectorAll('.dtabs button'),function(b){b.addEventListener('click',function(){tab=b.dataset.tab;render()})});
})();
