const boxes=[...document.querySelectorAll('[data-rehearsal]')];
const status=document.querySelector('#rehearsal-status');
function update(){
 const count=boxes.filter(box=>box.checked).length;
 status.textContent=`${count} de ${boxes.length} comprobaciones manuales. `+(count===boxes.length?'Lista marcada por el presentador; no acredita una certificación técnica ni aprobación de PROVISA.':'No es una certificación técnica; el ensayo humano sigue pendiente.');
}
// Clear restored form state too; a browser reload is not a completed rehearsal.
window.addEventListener('pageshow',()=>{for(const box of boxes)box.checked=false;update();});
for(const box of boxes)box.addEventListener('change',update);
document.querySelector('#print-guide').addEventListener('click',()=>window.print());
update();
