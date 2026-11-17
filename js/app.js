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
      var p=$('tr[data-p="'+id+'"]');if(p){$('.a',p).textContent=t.ass+' of '+t.n;$('.s',p).textContent=t.std+' of '+t.n;}
    });
    var ps;
    if(!Object.keys(res).some(function(k){return res[k].ass>0}))ps='No tier has been assessed yet.';
    else if(!res.l2.met)ps=res.l2.ass===res.l2.n?'Tier 1: Tier 2 has '+(res.l2.n-res.l2.std)+' criteria below the standard.':'Tier 2 assessment is in progress.';
    else{var nm='Tier 2: Golf Coach';if(res.l3.met)nm='Tier 3: Coach';if(res.l3.met&&res.lead.met)nm='Tier 3: Lead';if(res.l3.met&&res.l4.met)nm='Tier 4: Specialist';ps=nm+'.'+(!res.l3.met&&(res.lead.met||res.l4.met)?' Lead and Specialist also need the Tier 3 Coach standard to be met.':'');}
    $('#placeSugg').innerHTML='<strong>Suggested from the ratings:</strong> '+ps;
  }
  function expNote(){
    var id=$('input[name=level]:checked').value,m=META[id],cy=parseFloat($('#cy').value),iy=parseFloat($('#iy').value),t='Expected experience for '+m.label+': '+m.exp+'. ';
    if(!isNaN(cy)&&!isNaN(iy)){var low=[];if(cy<m.cmin)low.push('coaching experience');if(iy<m.imin)low.push('time at IMG Academy');
      t+=low.length?'<strong>Below the expected '+low.join(' and ')+'.</strong> Competence decides; experience alone does not establish readiness.':'<strong>At or above the expected experience.</strong> Competence still decides.';}
    else t+='Enter years to compare.';
    $('#expNote').innerHTML=t;
  }
  function setLevel(id){
    document.body.dataset.level=id;
    all('.lvl').forEach(function(l){l.classList.toggle('on',l.dataset.level===id)});
    all('#pills label').forEach(function(l){l.classList.toggle('on',$('input',l).value===id)});
    expNote();
  }
  $('#pills').addEventListener('change',function(e){if(e.target.name==='level')setLevel(e.target.value)});
  ['cy','iy'].forEach(function(i){$('#'+i).addEventListener('input',expNote)});
  document.addEventListener('change',update);
  document.addEventListener('click',function(e){var d=e.target.closest&&e.target.closest('details.dd');all('details.dd[open]').forEach(function(x){if(x!==d)x.open=false});});
  var opened=[];
  function pa(){document.body.classList.add('printall');opened=all('details.guide').filter(function(d){return !d.open});opened.forEach(function(d){d.open=true});}
  function done(){document.body.classList.remove('printall');opened.forEach(function(d){d.open=false});opened=[]}
  $('#printOne').addEventListener('click',function(){window.print()});
  $('#printAll').addEventListener('click',function(){pa();window.print();setTimeout(done,500)});
  window.addEventListener('afterprint',done);
  setLevel('l2');update();
})();
