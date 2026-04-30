"use client"
import React, { useState, useEffect } from "react"
import {
  Home, DollarSign, Monitor, ShoppingCart, Tag, BarChart3, Users,
  ChevronDown, ChevronsRight, Moon, Sun, TrendingUp, Activity,
  Package, Bell, Settings, HelpCircle, User,
} from "lucide-react"

export const Example = () => {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <div className={`flex min-h-screen w-full ${isDark ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar />
        <ExampleContent isDark={isDark} setIsDark={setIsDark} />
      </div>
    </div>
  )
}

const Sidebar = () => {
  const [open, setOpen] = useState(true)
  const [selected, setSelected] = useState("Dashboard")

  return (
    <nav className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${open ? 'w-64' : 'w-16'} border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm`}>
      <TitleSection open={open} />
      <div className="space-y-1 mb-8">
        {[
          { Icon: Home, title: "Dashboard" },
          { Icon: DollarSign, title: "Sales", notifs: 3 },
          { Icon: Monitor, title: "View Site" },
          { Icon: ShoppingCart, title: "Products" },
          { Icon: Tag, title: "Tags" },
          { Icon: BarChart3, title: "Analytics" },
          { Icon: Users, title: "Members", notifs: 12 },
        ].map(item => (
          <Option key={item.title} {...item} selected={selected} setSelected={setSelected} open={open} />
        ))}
      </div>
      {open && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</div>
          <Option Icon={Settings} title="Settings" selected={selected} setSelected={setSelected} open={open} />
          <Option Icon={HelpCircle} title="Help & Support" selected={selected} setSelected={setSelected} open={open} />
        </div>
      )}
      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  )
}

const Option = ({ Icon, title, selected, setSelected, open, notifs }: {
  Icon: React.ElementType; title: string; selected: string
  setSelected: (t: string) => void; open: boolean; notifs?: number
}) => {
  const isSelected = selected === title
  return (
    <button onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}>
      <div className="grid h-full w-12 place-content-center"><Icon className="h-4 w-4" /></div>
      {open && <span className="text-sm font-medium">{title}</span>}
      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-medium">{notifs}</span>
      )}
    </button>
  )
}

const TitleSection = ({ open }: { open: boolean }) => (
  <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
    <div className="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
          <svg width="20" height="auto" viewBox="0 0 50 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-white">
            <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
            <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
          </svg>
        </div>
        {open && <div><span className="block text-sm font-semibold">TomIsLoading</span><span className="block text-xs text-gray-500">Pro Plan</span></div>}
      </div>
      {open && <ChevronDown className="h-4 w-4 text-gray-400" />}
    </div>
  </div>
)

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) => (
  <button onClick={() => setOpen(!open)} className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
    <div className="flex items-center p-3">
      <div className="grid size-10 place-content-center">
        <ChevronsRight className={`h-4 w-4 transition-transform duration-300 text-gray-500 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Hide</span>}
    </div>
  </button>
)

const ExampleContent = ({ isDark, setIsDark }: { isDark: boolean; setIsDark: (v: boolean) => void }) => (
  <div className="flex-1 p-6 overflow-auto">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
        </button>
        <button onClick={() => setIsDark(!isDark)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"><User className="h-5 w-5" /></button>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { Icon: DollarSign, label: 'Total Sales', value: '$24,567', change: '+12%', color: 'blue' },
        { Icon: Users,      label: 'Active Users', value: '1,234',  change: '+5%',  color: 'green' },
        { Icon: ShoppingCart, label: 'Orders',    value: '456',    change: '+8%',  color: 'purple' },
        { Icon: Package,    label: 'Products',    value: '89',     change: '+3',   color: 'orange' },
      ].map(({ Icon, label, value, change, color }) => (
        <div key={label} className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}><Icon className={`h-5 w-5 text-${color}-600`} /></div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-sm text-green-600 mt-1">{change}</p>
        </div>
      ))}
    </div>
  </div>
)

export default Example
