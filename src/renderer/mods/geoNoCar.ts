// Adapted from : https://openuserjs.org/scripts/drparse/GeoNoCar
// @ts-nocheck
;(function geoNoCar() {
  const classicGameGuiHTML = `
    <div class="section_sectionHeader___QLJB section_sizeMedium__CuXRP">
      <div class="bars_root___G89E bars_center__vAqnw">
          <div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div>
          <span class="bars_content__UVGlL"><h3>NCNC settings</h3></span>
          <div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div>
      </div>
    </div>
    <div class="start-standard-game_settings__x94PU" style="margin-bottom: 1rem">
      <div style="display: flex; justify-content: space-between">
          <div style="display: flex; align-items: center">
              <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">No car</span>
              <input type="checkbox" id="enableNoCar" onclick="toggleNoCarMode(this)" class="toggle_toggle__hwnyw">
          </div>
          <div style="display: flex; align-items: center;">
              <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px;">No compass</span>
              <input type="checkbox" id="enableNoCompass" onclick="toggleNoCompassMode(this)" class="toggle_toggle__hwnyw">
          </div>
      </div>
    </div>
  `

  const REMOVE_COMPASS_CSS = '[data-qa="compass"], [class^="panorama-compass_"] { display: none; }'

  const compassRemover = document.createElement('style')
  compassRemover.textContent = REMOVE_COMPASS_CSS

  if (localStorage.getItem('noCarEnabled') === null) {
    localStorage.setItem('noCarEnabled', 'false')
  }

  if (localStorage.getItem('noCompassEnabled') === null) {
    localStorage.setItem('noCompassEnabled', 'false')
  }

  if (localStorage.getItem('noCarEnabled') === 'true') {
    noCarScript()
  }

  if (localStorage.getItem('noCompassEnabled') === 'true') {
    document.head.append(compassRemover)
  }

  window.toggleNoCarMode = (el: HTMLInputElement) => {
    localStorage.setItem('noCarEnabled', el.checked ? 'true' : 'false')

    const noCarCheckbox = document.getElementById('enableNoCar') as HTMLInputElement
    if (noCarCheckbox) {
      noCarCheckbox.checked = el.checked
    }

    location.reload()
  }

  window.toggleNoCompassMode = (el: HTMLInputElement) => {
    localStorage.setItem('noCompassEnabled', el.checked ? 'true' : 'false')

    const noCompassCheckbox = document.getElementById('enableNoCompass') as HTMLInputElement
    if (noCompassCheckbox) {
      noCompassCheckbox.checked = el.checked
    }

    if (el.checked) {
      document.head.append(compassRemover)
    } else {
      compassRemover.remove()
    }
  }

  const checkInsertGui = () => {
    if (
      document.querySelector('[class^="radio-box_root__"]') &&
      document.querySelector('#enableNoCar') === null
    ) {
      document
        .querySelector('[class^="section_sectionMedium__"]')
        .insertAdjacentHTML('beforeend', classicGameGuiHTML)

      if (localStorage.getItem('noCarEnabled') === 'true') {
        document.querySelector('#enableNoCar').checked = true
      }

      if (localStorage.getItem('noCompassEnabled') === 'true') {
        document.querySelector('#enableNoCompass').checked = true
      }
    }
  }

  const observer = new MutationObserver(() => {
    checkInsertGui()
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true
  })
})()

function noCarScript() {
  const OPTIONS = { colorR: 0.5, colorG: 0.5, colorB: 0.5 }
  const vertexOld =
    'const float f=3.1415926;varying vec3 a;uniform vec4 b;attribute vec3 c;attribute vec2 d;uniform mat4 e;void main(){vec4 g=vec4(c,1);gl_Position=e*g;a=vec3(d.xy*b.xy+b.zw,1);a*=length(c);}'
  const fragOld =
    'precision highp float;const float h=3.1415926;varying vec3 a;uniform vec4 b;uniform float f;uniform sampler2D g;void main(){vec4 i=vec4(texture2DProj(g,a).rgb,f);gl_FragColor=i;}'
  const vertexNew = `
            const float f=3.1415926;
            varying vec3 a;
            varying vec3 potato;
            uniform vec4 b;
            attribute vec3 c;
            attribute vec2 d;
            uniform mat4 e;
            void main(){
                vec4 g=vec4(c,1);
                gl_Position=e*g;
                a = vec3(d.xy * b.xy + b.zw,1);
                a *= length(c);
                potato = vec3(d.xy, 1.0) * length(c);
            }
        `
  const fragNew = `
            precision highp float;
            const float h=3.1415926;
            varying vec3 a;
            varying vec3 potato;
            uniform vec4 b;
            uniform float f;
            uniform sampler2D g;
            void main(){
                vec2 aD = potato.xy / a.z;
                float thetaD = aD.y;
                float thresholdD1 = 0.6;
                float thresholdD2 = 0.7;
                float x = aD.x;
                float y = abs(4.0*x - 2.0);
                float phiD = smoothstep(0.0, 1.0, y > 1.0 ? 2.0 - y : y);
                vec4 i = vec4(thetaD > mix(thresholdD1, thresholdD2, phiD)
                ? vec3(float(${OPTIONS.colorR}), float(${OPTIONS.colorG}), float(${OPTIONS.colorB})) // texture2DProj(g,a).rgb * 0.25
                : texture2DProj(g,a).rgb,f);
                gl_FragColor=i;
            }
        `

  function installShaderSource(ctx: WebGLRenderingContext | WebGL2RenderingContext) {
    const g = ctx.shaderSource
    function shaderSource(...args: WebGLRenderingContext['shaderSource'][]) {
      if (typeof args[1] === 'string') {
        let glsl: string = args[1]
        if (glsl === vertexOld) glsl = vertexNew
        else if (glsl === fragOld) glsl = fragNew
        return g.call(this, args[0], glsl)
      }
      return g.apply(this, args)
    }
    shaderSource.bestcity = 'bintulu'
    ctx.shaderSource = shaderSource
  }

  function installGetContext(el: HTMLCanvasElement) {
    const g = el.getContext
    el.getContext = function (...args) {
      if (args[0] === 'webgl' || args[0] === 'webgl2') {
        const ctx: WebGLRenderingContext | WebGL2RenderingContext = g.apply(this, args)
        if (ctx && ctx.shaderSource && ctx.shaderSource.bestcity !== 'bintulu') {
          installShaderSource(ctx)
        }
        return ctx
      }
      return g.apply(this, args)
    }
  }

  const createElement = document.createElement.bind(document)
  document.createElement = function (tagName: string, options?: ElementCreationOptions) {
    if (tagName === 'canvas' || tagName === 'CANVAS') {
      const el = createElement('canvas')
      installGetContext(el)
      return el
    }
    return createElement(tagName, options)
  }
}
