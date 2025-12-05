function g(e,n){const t=new Intl.Segmenter(void 0,{granularity:"grapheme"}),r=Array.from(t.segment(e),s=>s.segment);return r.length>n?r.slice(0,n).join("")+"...":e}export{g as t};
