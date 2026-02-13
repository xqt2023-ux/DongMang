import{d as b,o as r,c as i,a as s,h as m,f as u,p as y,l as V,u as k,_ as g}from"./index-2x2_fWAi.js";const w={class:"step-view story-script"},x={class:"form-section"},I={class:"form-group"},S={class:"ai-actions"},C=["disabled"],A={key:0},B={key:1},h={class:"form-group"},N=b({__name:"StoryScriptView",setup($){const d=V(),c=k(),o=u(""),l=u(""),a=u(!1);async function v(){o.value.trim()&&(a.value=!0,await new Promise(t=>setTimeout(t,2e3)),l.value=`【第一幕】
${o.value}

（场景描述：镜头缓缓推入...）

【第二幕】
（剧情发展...）

【第三幕】
（高潮部分...）

【尾声】
（结局...）`,a.value=!1)}function _(){const t=d.params.id;c.push(`/editor/${t}/global-settings`)}function f(){const t=d.params.id;c.push(`/editor/${t}/scene-assets`)}return(t,e)=>{const p=y("el-input");return r(),i("div",w,[e[4]||(e[4]=s("h1",{class:"step-title"},"故事剧本",-1)),e[5]||(e[5]=s("p",{class:"step-desc"},"输入故事梗概，AI 会自动扩展生成完整剧本，你也可以手动编辑",-1)),s("div",x,[s("div",I,[e[2]||(e[2]=s("label",{class:"form-label"},"故事梗概",-1)),m(p,{modelValue:o.value,"onUpdate:modelValue":e[0]||(e[0]=n=>o.value=n),type:"textarea",rows:4,placeholder:"简要描述你的故事大纲，例如：在末日废墟中，少年驾驶机甲与外星寄生体激战..."},null,8,["modelValue"])]),s("div",S,[s("button",{class:"btn-primary",onClick:v,disabled:a.value},[a.value?(r(),i("span",A,"⏳ 生成中...")):(r(),i("span",B,"✨ AI 生成剧本"))],8,C)]),s("div",h,[e[3]||(e[3]=s("label",{class:"form-label"},"完整剧本",-1)),m(p,{modelValue:l.value,"onUpdate:modelValue":e[1]||(e[1]=n=>l.value=n),type:"textarea",rows:16,placeholder:"AI 生成的完整剧本将显示在这里，你可以自由编辑..."},null,8,["modelValue"])])]),s("div",{class:"step-actions"},[s("button",{class:"btn-secondary",onClick:_},"← 上一步"),s("button",{class:"btn-primary",onClick:f},"保存并下一步 →")])])}}}),R=g(N,[["__scopeId","data-v-e8376a91"]]);export{R as default};
