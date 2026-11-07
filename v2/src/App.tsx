import { Shell } from './shell/Shell'
import { ThemeBridge } from './shell/ThemeBridge'

// One shell for every address, so that Back and Forward never remount the
// desktop and lose what its windows hold. The shell reads the address itself
// (see assets/js/windowing/address.js); the server answers any address that is
// neither the desktop nor an app's with v1's 404 page.
export default function App() {
  return (
    <>
      <a href="#main-content" className="os-skip-link">
        Skip to main content
      </a>
      <ThemeBridge />
      <Shell />
    </>
  )
}
