import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-50">
      <Header />
      <main className="flex-1 overflow-auto bg-neutral-50">
        <Outlet />
      </main>
    </div>
  )
}
