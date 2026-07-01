(function(){
  function toast(text){
    var t=document.querySelector('.toast');
    if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
    t.textContent=text;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},1400)
  }
  window.toast=toast;
  document.addEventListener('click',function(e){
    var tab=e.target.closest('.tab');
    if(tab){var p=tab.parentElement;p.querySelectorAll('.tab').forEach(function(n){n.classList.remove('active')});tab.classList.add('active');toast('已切换：'+tab.textContent.trim());}
    var chip=e.target.closest('.chip');
    if(chip){chip.classList.toggle('active')}
    var open=e.target.closest('[data-open-sheet]');
    if(open){var s=document.querySelector(open.getAttribute('data-open-sheet')); if(s){s.classList.add('show')}}
    var close=e.target.closest('[data-close-sheet]');
    if(close){var sh=close.closest('.sheet'); if(sh){sh.classList.remove('show')}}
    var act=e.target.closest('[data-action]');
    if(act){toast(act.getAttribute('data-action'))}
  });
  document.addEventListener('submit',function(e){e.preventDefault();toast('已保存')});
  window.sendMsg=function(){var input=document.querySelector('#chatInput');var area=document.querySelector('#messageArea');if(input&&input.value.trim()){var row=document.createElement('div');row.className='bubble-row mine';row.innerHTML='<div class="bubble"></div>';row.querySelector('.bubble').textContent=input.value.trim();area.appendChild(row);input.value='';toast('已发送')}};
})();
