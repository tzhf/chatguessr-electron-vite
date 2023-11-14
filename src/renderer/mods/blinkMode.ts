// Adapted from: https://greasyfork.org/en/scripts/438579-geoguessr-blink-mode

;(function blinkMode() {
  let timeLimit = 0.8
  let roundDelay = 1

  const classicGameGuiHTML = `
    <div class="section_sectionHeader___QLJB section_sizeMedium__CuXRP">
        <div class="bars_root___G89E bars_center__vAqnw">
            <div class="bars_before__xAA7R bars_lengthLong__XyWLx"></div>
            <span class="bars_content__UVGlL"><h3>Blink Mode settings</h3></span>
            <div class="bars_after__Z1Rxt bars_lengthLong__XyWLx"></div>
        </div>
    </div>
    <div class="start-standard-game_settings__x94PU" style="margin-bottom: 1rem">
        <div class="game-options_optionGroup__qNKx1">
            <div style="display: flex; justify-content: space-between">
                <div style="display: flex; align-items: center">
                    <span class="game-options_optionLabel__dJ_Cy" style="margin: 0; padding-right: 6px">Enabled</span>
                    <input type="checkbox" id="enableScript" onclick="toggleBlinkMode(this)" class="toggle_toggle__hwnyw" />
                </div>

                <div style="display: flex; align-items: center">
                    <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
                        <div class="game-options_optionLabel__dJ_Cy">Time (Seconds)</div>
                        <input
                            type="range"
                            class="custom-slider"
                            min="0.1"
                            max="5"
                            step="0.1"
                            id="blinkTime"
                            oninput="changeBlinkTime(this)"
                        />
                        <div class="game-options_optionLabel__dJ_Cy" id="blinkTimeText"></div>
                    </label>
                </div>

                <div style="display: flex; align-items: center">
                    <label class="game-options_option__eCz9o game-options_editableOption__Mpvar">
                        <div class="game-options_optionLabel__dJ_Cy">Round delay (Seconds)</div>
                        <input
                            type="range"
                            class="custom-slider"
                            min="0.1"
                            max="5"
                            step="0.1"
                            id="delayTime"
                            oninput="changeDelayTime(this)"
                        />
                        <div class="game-options_optionLabel__dJ_Cy" id="delayTimeText"></div>
                    </label>
                </div>
            </div>
        </div>
    </div>
  `

  if (localStorage.getItem('blinkEnabled') === null) {
    localStorage.setItem('blinkEnabled', 'false')
  }

  const blinkTime = localStorage.getItem('blinkTime')
  if (blinkTime === null || isNaN(Number(blinkTime))) {
    localStorage.setItem('blinkTime', timeLimit.toString())
  }

  const delayTime = localStorage.getItem('delayTime')
  if (delayTime === null || isNaN(Number(delayTime))) {
    localStorage.setItem('delayTime', roundDelay.toString())
  }

  timeLimit = parseFloat(localStorage.getItem('blinkTime')!)
  roundDelay = parseFloat(localStorage.getItem('delayTime')!)

  window.toggleBlinkMode = (el: HTMLInputElement) => {
    localStorage.setItem('blinkEnabled', el.checked ? 'true' : 'false')
    if (!el.checked) {
      try {
        showPanoramaCached()
      } catch {
        console.log('error')
      }
    }

    const enableScriptElement = document.getElementById('enableScript') as HTMLInputElement
    if (enableScriptElement) enableScriptElement.checked = el.checked
  }

  window.changeBlinkTime = (el: HTMLInputElement) => {
    if (!isNaN(Number(el.value))) {
      localStorage.setItem('blinkTime', el.value)
      timeLimit = parseFloat(el.value)

      const blinkTimeTextElement = document.getElementById('blinkTimeText')
      if (blinkTimeTextElement) blinkTimeTextElement.textContent = el.value + ' sec'
    }
  }

  window.changeDelayTime = (el: HTMLInputElement) => {
    if (!isNaN(Number(el.value))) {
      localStorage.setItem('delayTime', el.value)
      roundDelay = parseFloat(el.value)

      const delayTimeTextElement = document.getElementById('delayTimeText')
      if (delayTimeTextElement) delayTimeTextElement.textContent = el.value + ' sec'
    }
  }

  const checkInsertGui = () => {
    if (
      document.querySelector('.radio-box_root__ka_9S') &&
      document.getElementById('enableScript') === null
    ) {
      document
        .querySelector('.section_sectionMedium__yXgE6')
        ?.insertAdjacentHTML('beforeend', classicGameGuiHTML)

      if (localStorage.getItem('blinkEnabled') === 'true') {
        const enableScriptElement = document.getElementById('enableScript') as HTMLInputElement
        if (enableScriptElement) enableScriptElement.checked = true
      }

      const blinkTimeElement = document.getElementById('blinkTime') as HTMLInputElement
      blinkTimeElement.value = timeLimit.toString()
      const delayTimeElement = document.getElementById('delayTime') as HTMLInputElement
      delayTimeElement.value = roundDelay.toString()
      document.getElementById('blinkTimeText')!.textContent = timeLimit + ' sec'
      document.getElementById('delayTimeText')!.textContent = roundDelay + ' sec'
    }
  }

  let mapRoot: HTMLElement
  function hidePanorama() {
    mapRoot = document.querySelector('.mapsConsumerUiSceneInternalCoreScene__root') || mapRoot
    hidePanoramaCached()
  }

  function hidePanoramaCached() {
    mapRoot.style.filter = 'brightness(0%)'
  }

  function showPanorama() {
    mapRoot = document.querySelector('.mapsConsumerUiSceneInternalCoreScene__root') || mapRoot
    showPanoramaCached()
  }

  function showPanoramaCached() {
    mapRoot.style.filter = 'brightness(100%)'
  }

  function isLoading() {
    return (
      document.querySelector('.fullscreen-spinner_root__IwRRr') ||
      !document.querySelector('.widget-scene-canvas')
    )
  }

  let wasBackdropThereOrLoading = false
  function isBackdropThereOrLoading() {
    return isLoading() || document.querySelector('.result-layout_root__NfX12')
  }

  let showTimeoutID: NodeJS.Timeout
  let hideTimeoutID: NodeJS.Timeout
  function triggerBlink() {
    hidePanorama()
    clearTimeout(showTimeoutID)
    showTimeoutID = setTimeout(showPanorama, roundDelay * 1000)
    clearTimeout(hideTimeoutID)
    hideTimeoutID = setTimeout(hidePanorama, (timeLimit + roundDelay) * 1000)
  }

  const observer = new MutationObserver(() => {
    checkInsertGui()

    if (localStorage.getItem('blinkEnabled') === 'true') {
      if (isBackdropThereOrLoading()) {
        wasBackdropThereOrLoading = true
        if (!isLoading()) hidePanorama()
      } else if (wasBackdropThereOrLoading) {
        wasBackdropThereOrLoading = false
        triggerBlink()
      }
    }
  })

  observer.observe(document.body, {
    subtree: true,
    childList: true
  })
})()
