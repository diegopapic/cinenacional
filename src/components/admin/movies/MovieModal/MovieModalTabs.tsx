// src/components/admin/movies/MovieModal/MovieModalTabs.tsx
import * as Tabs from '@radix-ui/react-tabs'
import { Info, Image, Users, Briefcase, Settings } from 'lucide-react'

interface MovieModalTabsProps {
  activeTab: string
  onTabChange: (value: string) => void
}

const TABS = [
  { value: 'basic', label: 'Información Básica', icon: Info },
  { value: 'media', label: 'Multimedia', icon: Image },
  { value: 'cast', label: 'Reparto', icon: Users },
  { value: 'crew', label: 'Equipo Técnico', icon: Briefcase },
  { value: 'advanced', label: 'Avanzado', icon: Settings }
]

export default function MovieModalTabs({ activeTab, onTabChange }: MovieModalTabsProps) {
  return (
    <Tabs.List className="flex border-b border-gray-200 px-6 pt-4">
      {TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {tab.label}
            </div>
          </Tabs.Trigger>
        )
      })}
    </Tabs.List>
  )
}