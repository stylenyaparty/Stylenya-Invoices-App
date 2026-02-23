interface NavBarProps {
  active: 'invoices' | 'settings' | 'reports'
  onNavigate: (page: 'invoices' | 'settings' | 'reports') => void
}

const navButtonClass = (active: boolean) =>
  `rounded-md px-4 py-2 text-sm font-medium transition ${
    active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

export const NavBar = ({ active, onNavigate }: NavBarProps) => (
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
      <span className="mr-4 text-lg font-semibold text-slate-900">Stylenya Invoices</span>
      <nav className="flex flex-wrap gap-2">
        <button className={navButtonClass(active === 'invoices')} onClick={() => onNavigate('invoices')} type="button">
          Invoices
        </button>
        <button className={navButtonClass(active === 'settings')} onClick={() => onNavigate('settings')} type="button">
          Settings
        </button>
        <button className={navButtonClass(active === 'reports')} onClick={() => onNavigate('reports')} type="button">
          Reports
        </button>
      </nav>
    </div>
  </header>
)
