const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const content='<p>Första vanliga stycket.</p><h2>En viktig rubrik</h2><blockquote><p>Ett bibelställe med ord.</p></blockquote><p>Sista vanliga stycket.</p>'+Array.from({length:45},(_,i)=>`<p>Långt testmanus rad ${i}. Text för att prova rullning.</p>`).join('');
const script={id:'test-script',categoryId:'test-category',title:'Testmanus',content,plainText:'Testmanus',isFavorite:true,fontFamily:'Arial',fontSize:52,lineHeight:1.45,textAlign:'left',textWidth:760,teleprompterSpeed:42,speechRate:130,estimatedDuration:28,lastPosition:0,createdAt:1,updatedAt:1};
const cases=[['Chrome macOS',chromium,{viewport:{width:1280,height:900}}],['WebKit macOS',webkit,{viewport:{width:1280,height:900}}],['WebKit iPad portrait',webkit,{...devices['iPad (gen 7)']}],['WebKit iPad landscape',webkit,{...devices['iPad (gen 7) landscape']}],['Chrome narrow touch',chromium,{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1}]];
const results=[];
async function select(page,selector,start,end){await page.locator('.rich-editor').evaluate((editor,{selector,start,end})=>{editor.focus({preventScroll:true});const node=editor.querySelector(selector).firstChild;const selection=getSelection();selection.setBaseAndExtent(node,start,node,end);},{selector,start,end});await page.waitForTimeout(50)}
async function run(name,type,options){const browser=await type.launch(type===chromium?{channel:'chrome',headless:true}:{headless:true});const context=await browser.newContext({...options,serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765')?route.continue():route.abort());await context.addInitScript(data=>localStorage.setItem('talarstod-data-v1',JSON.stringify(data)),{categories:[{id:'test-category',name:'Tester',description:'',sortOrder:0,createdAt:1,updatedAt:1}],scripts:[script]});
try{
 await page.goto('http://127.0.0.1:8765');
 await page.getByRole('button',{name:'Använd endast på denna enhet utan synkning'}).click();
 await page.getByRole('heading',{name:'Testmanus',exact:true}).click();
 await page.locator('.rich-editor').waitFor();
 const format=page.getByRole('combobox',{name:'Styckeformat'});
 await select(page,'h2',3,3);assert.equal(await format.inputValue(),'h2');
 await select(page,'h2',8,3);assert.equal(await page.evaluate(()=>getSelection().anchorOffset),8);
 await select(page,'h2',3,8);assert.equal(await format.inputValue(),'h2');
 await select(page,'blockquote p',4,15);assert.equal(await format.inputValue(),'blockquote');
 await select(page,'p',0,6);assert.equal(await format.inputValue(),'p');
 // Deliberately emulate Safari changing selection while the native select opens.
 await format.dispatchEvent('pointerdown',{pointerType:'touch'});await format.focus();
 await page.evaluate(()=>{const n=document.querySelector('.rich-editor h2').firstChild;getSelection().setBaseAndExtent(n,0,n,0)});
 await format.selectOption('blockquote');
 assert.match(await page.locator('.rich-editor > blockquote').first().innerText(),/Första vanliga/);
 assert.equal(await page.evaluate(()=>getSelection().toString()),'Första');
 // Button formatting preserves selected text, with immediate active state.
 await select(page,':scope > p',0,5);
 const bold=page.getByRole('button',{name:'Halvfet',exact:true});
 if(options.hasTouch)await bold.tap();else await bold.click();
 assert.equal(await bold.getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>getSelection().toString()),'Sista');
 await page.getByRole('button',{name:'Ångra',exact:true}).click();assert.equal(await bold.getAttribute('aria-pressed'),'false');
 await page.getByRole('button',{name:'Gör om',exact:true}).click();assert.equal(await bold.getAttribute('aria-pressed'),'true');
 const blue=page.getByRole('button',{name:'Blå text',exact:true});if(options.hasTouch)await blue.tap();else await blue.click();
 assert.equal(await page.evaluate(()=>getSelection().toString()),'Sista');
 assert.match(await page.locator('.rich-editor').innerHTML(),/rgb\(40, 127, 189\)|#287fbd/i);
 // Changing back does not add blank paragraphs; heading remains selectable.
 await select(page,'h2',0,2);await format.selectOption('p');
 assert.equal(await page.locator('.rich-editor h2').count(),0);
 // Mixed selection reports mixed formats rather than a misleading single value.
 await page.locator('.rich-editor').evaluate(editor=>{editor.focus();const a=editor.querySelector('blockquote').firstChild;const start=a.nodeType===3?a:a.firstChild;const end=editor.querySelectorAll(':scope > p')[0].firstChild;getSelection().setBaseAndExtent(start,0,end,3)});
 await page.waitForTimeout(60);assert.equal(await format.inputValue(),'');
 // Toolbar never overlaps the paper, even after long scrolls.
 const before=await page.locator('.toolbar').boundingBox();
 await page.locator('.paper').evaluate(el=>el.scrollTop=2000);
 const after=await page.locator('.toolbar').boundingBox();const paper=await page.locator('.paper').boundingBox();
 assert.equal(before.y,after.y);assert.ok(after.y+after.height<=paper.y+1);assert.ok(await page.locator('.paper').evaluate(el=>el.scrollTop)>1000);
 const spacing=await page.locator('.rich-editor blockquote').first().evaluate(el=>{const s=getComputedStyle(el);return {before:parseFloat(s.marginTop),after:parseFloat(s.marginBottom),line:parseFloat(s.lineHeight)}});assert.ok(spacing.before>=spacing.line-1&&spacing.after>=spacing.line-1);
 // Keyboard-like viewport shrink and orientation changes leave usable manuscript.
 await page.setViewportSize({width:options.viewport.width,height:390});await page.waitForTimeout(80);
 const smallPaper=await page.locator('.paper').boundingBox();const smallToolbar=await page.locator('.toolbar').boundingBox();assert.ok(smallPaper.height>100);assert.ok(smallToolbar.y>=0);assert.ok(smallToolbar.y+smallToolbar.height<=smallPaper.y+1);
 await page.setViewportSize(options.viewport);await page.waitForTimeout(80);
 await page.locator('.paper').evaluate(el=>el.scrollTop=0);
 await page.getByRole('button',{name:'Spara',exact:true}).click();await page.waitForTimeout(80);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('talarstod-data-v1')).scripts[0]);assert.match(saved.content,/<blockquote/);assert.match(saved.content,/(font-weight|<b\b|<strong\b)/);assert.equal(saved.id,'test-script');
 await page.screenshot({path:`tests/${name.replaceAll(' ','-')}.png`});
 await page.getByRole('button',{name:'Starta teleprompter'}).click();await page.locator('.prompter').waitFor();assert.equal(await page.locator('.editor-active').count(),0);assert.ok(await page.locator('.prompter-text blockquote').count()>0);
 await page.mouse.move(30,150);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();await page.getByRole('button',{name:'Redigera',exact:true}).click();await page.locator('.rich-editor').waitFor();
 assert.equal(await page.locator('.editor-active').count(),1);assert.equal(await page.locator('.rich-editor').innerHTML(),saved.content);
 assert.deepEqual(errors,[]);results.push({name,status:'PASS'});console.log('PASS',name);
}catch(e){results.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.stack);await page.screenshot({path:`tests/failure-${name.replaceAll(' ','-')}.png`}).catch(()=>{});}finally{await browser.close()}}
(async()=>{for(const c of cases)await run(...c);fs.writeFileSync('tests/results.json',JSON.stringify(results,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1})().catch(e=>{console.error(e);process.exit(1)});
