const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement): HTMLElement | void {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement): HTMLElement | void {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  }
}

export default function useLoading() {
  const styleContent = `
        .app-loading-wrap {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1a1a2e;
            z-index: 9;
        }
        .loader {
            width: 60px;
            animation: spin 3s infinite ease-in-out;
        }
        @keyframes spin {
            0% { transform: rotate(0deg) }
            100% { transform: rotate(360deg) }
        }
    `
  const style = document.createElement('style')
  const div = document.createElement('div')

  style.innerHTML = styleContent
  div.className = 'app-loading-wrap'
  div.innerHTML = `<img class="loader" src="asset:cg-icon.svg" alt="Chatguessr logo" />`

  return {
    appendLoading() {
      safeDOM.append(document.head, style)
      safeDOM.append(document.body, div)
    },
    removeLoading() {
      safeDOM.remove(document.head, style)
      safeDOM.remove(document.body, div)
    }
  }
}
