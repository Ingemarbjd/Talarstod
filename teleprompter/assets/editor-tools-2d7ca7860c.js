// Small React hook shared by the deployed editor and regression harness.
export function useEditorTools(React, editorRef, scriptId) {
  const empty = { block: 'p', bold: false, italic: false, underline: false,
    insertUnorderedList: false, insertOrderedList: false };
  const [format, setFormat] = React.useState(empty);
  const saved = React.useRef(null);
  const locked = React.useRef(false);
  const inside = node => !!node && !!editorRef.current?.contains(node);
  const valid = range => range && inside(range.startContainer) && inside(range.endContainer);

  function blockAt(node) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    let heading = false;
    while (el && el !== editorRef.current) {
      // A paragraph nested in a quotation still has the quotation format.
      if (el.tagName === 'BLOCKQUOTE') return 'blockquote';
      if (/^H[1-6]$/.test(el.tagName)) heading = true;
      el = el.parentElement;
    }
    return heading ? 'h2' : 'p';
  }

  function readFormat(selection) {
    const range = selection.getRangeAt(0);
    const blocks = new Set();
    if (range.collapsed) blocks.add(blockAt(selection.anchorNode));
    else {
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.length || !range.intersectsNode(node)) continue;
        if (node === range.endContainer && range.endOffset === 0) continue;
        if (node === range.startContainer && range.startOffset === node.length) continue;
        blocks.add(blockAt(node));
      }
    }
    const next = { block: blocks.size > 1 ? '' : [...blocks][0] || blockAt(range.startContainer) };
    for (const command of Object.keys(empty).filter(key => key !== 'block')) {
      next[command] = document.queryCommandState(command);
    }
    setFormat(previous => Object.keys(next).every(key => next[key] === previous[key]) ? previous : next);
  }

  function capture() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !valid(selection.getRangeAt(0))) return false;
    saved.current = { range: selection.getRangeAt(0).cloneRange(),
      anchor: selection.anchorNode, anchorOffset: selection.anchorOffset,
      focus: selection.focusNode, focusOffset: selection.focusOffset };
    readFormat(selection);
    return true;
  }

  function prepare(event) {
    if (!locked.current) capture();
    locked.current = true;
    // Do not cancel touch pointerdown: WebKit can suppress the subsequent click.
    // The locked snapshot survives focus changes until the command restores it.
  }

  function restore() {
    const snapshot = saved.current;
    if (!valid(snapshot?.range)) return false;
    editorRef.current.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(snapshot.range);
    // Retain backwards selections as well as their text range.
    if (selection.setBaseAndExtent && inside(snapshot.anchor) && inside(snapshot.focus)) {
      try { selection.setBaseAndExtent(snapshot.anchor, snapshot.anchorOffset, snapshot.focus, snapshot.focusOffset); }
      catch { /* The live range remains usable after an edit changed a text node. */ }
    }
    return true;
  }

  function refresh() {
    locked.current = false;
    capture();
  }

  React.useEffect(() => {
    saved.current = null;
    locked.current = false;
    setFormat(empty);
    const onSelection = () => { if (!locked.current && !capture()) saved.current = null; };
    const onKey = event => { if (inside(event.target)) locked.current = false; };
    const onPointer = event => {
      if (event.target.closest('.toolbar')) return;
      locked.current = false;
      if (!inside(event.target)) saved.current = null;
    };
    const onFocus = event => {
      if (!inside(event.target) && !event.target.closest('.toolbar')) {
        saved.current = null;
        locked.current = false;
      }
    };
    document.addEventListener('selectionchange', onSelection);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKey);
    return () => {
      saved.current = null;
      document.removeEventListener('selectionchange', onSelection);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('keydown', onKey);
    };
  }, [scriptId]);

  // Keep controls outside the manuscript's scrolling area. VisualViewport tracks
  // the usable area above the iPad keyboard, including Safari's viewport panning.
  React.useEffect(() => {
    const shell = editorRef.current.closest('.app-shell');
    if (!shell) return;
    const viewport = window.visualViewport;
    const update = () => {
      shell.style.setProperty('--editor-height', `${viewport?.height ?? window.innerHeight}px`);
      shell.style.setProperty('--editor-offset', `${viewport?.offsetTop ?? 0}px`);
      shell.classList.toggle('editor-compact', (viewport?.height ?? window.innerHeight) < 540);
    };
    shell.classList.add('editor-active');
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      shell.classList.remove('editor-active', 'editor-compact');
      shell.style.removeProperty('--editor-height');
      shell.style.removeProperty('--editor-offset');
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return { format, prepare, restore, refresh };
}
