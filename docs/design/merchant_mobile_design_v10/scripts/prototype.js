(function(){
  function showToast(text){
    var t=document.querySelector('.toast');
    if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent=text || '已操作'; t.classList.add('show');
    clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(function(){t.classList.remove('show')},1400);
  }
  window.openSheet=function(id){
    var mask=document.querySelector('[data-sheet-mask]'); var sheet=document.getElementById(id);
    if(mask) mask.classList.add('show'); if(sheet) sheet.classList.add('show');
  };
  window.closeSheet=function(){
    document.querySelectorAll('.sheet.show').forEach(function(s){s.classList.remove('show')});
    var mask=document.querySelector('[data-sheet-mask]'); if(mask) mask.classList.remove('show');
  };
  document.addEventListener('click', function(e){
    var toast=e.target.closest('[data-toast]');
    if(toast){ if(toast.tagName==='BUTTON') e.preventDefault(); showToast(toast.getAttribute('data-toast')); }
    var opener=e.target.closest('[data-open-sheet]');
    if(opener){ e.preventDefault(); openSheet(opener.getAttribute('data-open-sheet')); }
    if(e.target.closest('[data-close-sheet]') || e.target.matches('[data-sheet-mask]')){ e.preventDefault(); closeSheet(); }
    var opt=e.target.closest('.option');
    if(opt){ var g=opt.parentElement; if(g){ g.querySelectorAll('.option').forEach(function(x){x.classList.remove('active')}); opt.classList.add('active'); } }
    var chip=e.target.closest('[data-chip]');
    if(chip){ var wrap=chip.closest('[data-chip-group]') || chip.parentElement; wrap.querySelectorAll('[data-chip]').forEach(function(x){x.classList.remove('active')}); chip.classList.add('active'); filterList(chip.getAttribute('data-chip')); }
    var tab=e.target.closest('[data-filter-tabs] .tab');
    if(tab){ tab.parentElement.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')}); tab.classList.add('active'); filterList(tab.getAttribute('data-filter')); }
  });
  function filterList(key){
    if(!key) return;
    var list=document.querySelector('[data-filter-list]'); if(!list) return;
    var shown=0;
    list.querySelectorAll('[data-status]').forEach(function(item){
      var ok=(key==='all' || item.dataset.status===key || item.dataset.tag===key || (item.dataset.tags||'').split(',').indexOf(key)>-1);
      item.classList.toggle('hidden', !ok); if(ok) shown++;
    });
    list.classList.toggle('is-empty', shown===0);
  }
  document.addEventListener('input', function(e){
    if(!e.target.matches('[data-search-input]')) return;
    var q=e.target.value.trim().toLowerCase(); var list=document.querySelector('[data-filter-list]'); if(!list) return;
    var shown=0;
    list.querySelectorAll('[data-search]').forEach(function(item){
      var ok=item.getAttribute('data-search').toLowerCase().indexOf(q)>-1;
      item.classList.toggle('hidden', !ok); if(ok) shown++;
    });
    list.classList.toggle('is-empty', shown===0);
  });
})();


// V6: multi-select chips for service tags / display config / goods selection mock
(function(){
  document.addEventListener('click', function(e){
    var multi=e.target.closest('[data-multi-chip]');
    if(multi){ e.preventDefault(); multi.classList.toggle('active'); }
    var toggle=e.target.closest('[data-toggle-check]');
    if(toggle){ e.preventDefault(); var dot=toggle.querySelector('.check-dot'); if(dot){ dot.classList.toggle('active'); } toggle.classList.toggle('selected'); }
  });
})();


// V7 demo interactions: tab panes, fake switch, steppers, choose type, selected count
(function(){
  function toast(text){
    var t=document.querySelector('.toast');
    if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent=text||'已操作'; t.classList.add('show');
    clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(function(){t.classList.remove('show')},1400);
  }
  function refreshSelectedCount(){
    document.querySelectorAll('[data-selected-count]').forEach(function(node){
      var root=document.querySelector(node.getAttribute('data-selected-count'))||document;
      node.textContent=root.querySelectorAll('.selected,[data-toggle-check] .check-dot.active').length;
    });
  }
  document.addEventListener('click',function(e){
    var sw=e.target.closest('[data-switch]');
    if(sw){ e.preventDefault(); sw.classList.toggle('active'); toast(sw.classList.contains('active')?'已开启':'已关闭'); }
    var step=e.target.closest('[data-step]');
    if(step){ e.preventDefault(); var box=step.closest('.stepper'); var num=box && box.querySelector('[data-step-value]'); if(num){ var v=parseInt(num.textContent||'0',10)||0; v += step.getAttribute('data-step')==='plus'?1:-1; if(v<0)v=0; num.textContent=v; } }
    var pane=e.target.closest('[data-show-pane]');
    if(pane){ e.preventDefault(); var id=pane.getAttribute('data-show-pane'); var group=pane.closest('[data-pane-tabs]'); if(group){ group.querySelectorAll('[data-show-pane]').forEach(function(x){x.classList.remove('active')}); pane.classList.add('active'); } document.querySelectorAll('[data-pane]').forEach(function(x){x.classList.toggle('hidden',x.getAttribute('data-pane')!==id);}); }
    var type=e.target.closest('[data-activity-type]');
    if(type){ e.preventDefault(); var wrap=type.closest('.activity-type-grid')||type.parentElement; wrap.querySelectorAll('[data-activity-type]').forEach(function(x){x.classList.remove('active')}); type.classList.add('active'); var target=document.querySelector('[data-type-result]'); if(target){target.textContent=type.getAttribute('data-activity-type');} toast('已选择：'+type.querySelector('strong').textContent); }
    setTimeout(refreshSelectedCount,0);
  });
  document.addEventListener('DOMContentLoaded',refreshSelectedCount);
})();


// V9: delete/reduce demo controls for specs and cards
(function(){
  function showToast(text){
    var t=document.querySelector('.toast');
    if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
    t.textContent=text || '已操作'; t.classList.add('show');
    clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(function(){t.classList.remove('show')},1400);
  }
  document.addEventListener('click', function(e){
    var del=e.target.closest('[data-delete-parent]');
    if(del){
      e.preventDefault(); e.stopPropagation();
      var selector=del.getAttribute('data-delete-parent');
      var node=del.closest(selector);
      if(node){ node.remove(); showToast('已删除'); }
    }
  }, true);
})();

// V10：活动类型切换时，同步显示对应规则配置。后续转小程序时可改为 setData({ activityType })。
(function(){
  function syncActivityConfig(value){
    if(!value) return;
    document.querySelectorAll('[data-activity-config]').forEach(function(panel){
      panel.classList.toggle('hidden', panel.getAttribute('data-activity-config') !== value);
    });
  }
  document.addEventListener('click', function(e){
    var type=e.target.closest('[data-activity-type-value]');
    if(!type) return;
    syncActivityConfig(type.getAttribute('data-activity-type-value'));
  });
  document.addEventListener('DOMContentLoaded', function(){
    var active=document.querySelector('[data-activity-type-value].active');
    if(active) syncActivityConfig(active.getAttribute('data-activity-type-value'));
  });
})();
