import { useState } from 'react';
import { Plus, Trash2, Link, ExternalLink } from 'lucide-react';

interface MovieLink {
  id?: number;
  type: string;
  url: string;
  isActive?: boolean;
}

interface MovieLinksManagerProps {
  initialLinks?: MovieLink[];
  onLinksChange: (links: MovieLink[]) => void;
}

const LINK_TYPES = [
  { value: 'INSTAGRAM', label: 'Instagram', icon: '📷' },
  { value: 'TWITTER', label: 'X (Twitter)', icon: '𝕏' },
  { value: 'FACEBOOK', label: 'Facebook', icon: '👤' },
  { value: 'TIKTOK', label: 'TikTok', icon: '🎵' },
  { value: 'YOUTUBE', label: 'YouTube', icon: '▶️' },
  { value: 'WEBSITE', label: 'Sitio Web Oficial', icon: '🌐' }
];

export default function MovieLinksManager({
  initialLinks = [],
  onLinksChange
}: MovieLinksManagerProps) {
  const [links, setLinks] = useState<MovieLink[]>(initialLinks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLink, setNewLink] = useState<MovieLink>({
    type: 'WEBSITE',
    url: ''
  });

  const handleAddLink = () => {
    if (!newLink.url || !newLink.type) return;

    const updatedLinks = [...links, { ...newLink, isActive: true }];
    setLinks(updatedLinks);
    onLinksChange(updatedLinks);

    // Reset form
    setNewLink({ type: 'WEBSITE', url: '' });
    setShowAddForm(false);
  };

  const handleRemoveLink = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    setLinks(updatedLinks);
    onLinksChange(updatedLinks);
  };

  const getLinkTypeInfo = (type: string) => {
    return LINK_TYPES.find(t => t.value === type) || LINK_TYPES[5];
  };

  const getPlaceholderUrl = (type: string) => {
    switch (type) {
      case 'INSTAGRAM':
        return 'https://www.instagram.com/peliculaejemplo';
      case 'TWITTER':
        return 'https://twitter.com/peliculaejemplo';
      case 'FACEBOOK':
        return 'https://www.facebook.com/peliculaejemplo';
      case 'TIKTOK':
        return 'https://www.tiktok.com/@peliculaejemplo';
      case 'YOUTUBE':
        return 'https://www.youtube.com/channel/UCxxxxxx';
      case 'WEBSITE':
      default:
        return 'https://www.peliculaejemplo.com';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Link className="w-5 h-5" />
        Links Oficiales
      </h3>

      {/* Lista de links existentes */}
      {links.length > 0 && (
        <div className="space-y-2 mb-4">
          {links.map((link, index) => {
            const typeInfo = getLinkTypeInfo(link.type);
            return (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl">{typeInfo.icon}</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{typeInfo.label}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {link.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario para agregar nuevo link */}
      {showAddForm ? (
        <div className="border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Link
            </label>
            <select
              value={newLink.type}
              onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {LINK_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder={getPlaceholderUrl(newLink.type)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewLink({ type: 'WEBSITE', url: '' });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!newLink.url}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Agregar Link
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Link Oficial
        </button>
      )}

      {links.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 italic">
          No hay links oficiales agregados para esta película.
        </p>
      )}
    </div>
  );
}