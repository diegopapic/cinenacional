// src/components/admin/movies/MovieModal/index.tsx
import * as Tabs from '@radix-ui/react-tabs'
import { useMovieModalContext } from '@/contexts/MovieModalContext'

// Componentes del modal
import MovieModalHeader from './MovieModalHeader'
import MovieModalTabs from './MovieModalTabs'
import MovieModalFooter from './MovieModalFooter'

// Tabs
import BasicInfoTab from './tabs/BasicInfoTab'
import MediaTab from './tabs/MediaTab'
import CastTab from './tabs/CastTab'
import CrewTab from './tabs/CrewTab'
import ImagesTab from './tabs/ImagesTab'
import AdvancedTab from './tabs/AdvancedTab'

interface MovieModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MovieModal({ isOpen, onClose }: MovieModalProps) {
  // Obtener todos los datos del context en lugar de props
  const {
    // Form methods
    handleSubmit,
    
    // UI state
    activeTab,
    setActiveTab,
    isSubmitting,
    
    // Submit handler
    onSubmit
  } = useMovieModalContext()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <MovieModalHeader onClose={onClose} />

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
            <MovieModalTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className="p-6">
              <Tabs.Content value="basic">
                <BasicInfoTab />
              </Tabs.Content>

              <Tabs.Content value="media">
                <MediaTab />
              </Tabs.Content>

              {/* forceMount en cast y crew para evitar que se desmonten al cambiar de tab,
                  lo que causaba pérdida de datos en movieRelations por la race condition
                  entre los useEffects de inicialización y notificación */}
              <Tabs.Content value="cast" forceMount className={activeTab !== 'cast' ? 'hidden' : ''}>
                <CastTab />
              </Tabs.Content>

              <Tabs.Content value="crew" forceMount className={activeTab !== 'crew' ? 'hidden' : ''}>
                <CrewTab />
              </Tabs.Content>

              <Tabs.Content value="images">
                <ImagesTab />
              </Tabs.Content>

              <Tabs.Content value="advanced">
                <AdvancedTab />
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <MovieModalFooter onCancel={onClose} />
        </form>
      </div>
    </div>
  )
}