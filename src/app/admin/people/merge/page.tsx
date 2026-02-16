'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Merge, ArrowRight, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput';

interface PersonData {
  id: number;
  firstName: string | null;
  lastName: string | null;
  realName: string | null;
  slug: string;
  photoUrl: string | null;
  biography: string | null;
  gender: string | null;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  deathYear: number | null;
  deathMonth: number | null;
  deathDay: number | null;
  birthLocationId: number | null;
  deathLocationId: number | null;
  birthLocation: any;
  deathLocation: any;
  imdbId: string | null;
  tmdbId: number | null;
  alternativeNames: Array<{ id: number; fullName: string }>;
  links: Array<{ id: number; url: string; type: string }>;
  nationalities: Array<{ locationId: number; location: { name: string } }>;
  movieCount: number;
  _count: {
    castRoles: number;
    crewRoles: number;
    imageAppearances: number;
    awards: number;
    festivalJury: number;
    festivalAwardWinners: number;
    pageViews: number;
  };
}

interface FieldComparison {
  field: string;
  label: string;
  valueA: any;
  valueB: any;
  displayA: string;
  displayB: string;
}

interface UniqueCounts {
  castToTransfer: number;
  crewToTransfer: number;
  altNamesToAdd: number;
  linksToTransfer: number;
  nationalitiesToAdd: number;
  imageAppearances: number;
  awards: number;
  festivalJury: number;
  festivalAwardWinners: number;
  pageViews: number;
}

interface PreviewData {
  personA: PersonData;
  personB: PersonData;
  suggestedSurvivor: 'A' | 'B' | 'TIE';
  fieldComparisons: FieldComparison[];
  sharedCastCount: number;
  sharedCrewCount: number;
  uniqueCounts: {
    A: UniqueCounts;
    B: UniqueCounts;
  };
}

interface MergeResult {
  success: boolean;
  survivorId: number;
  absorbedId: number;
  survivorSlug: string;
  stats: Record<string, number>;
}

// A field as the frontend sees it, with dynamic survivor-awareness
interface DisplayField {
  field: string;
  label: string;
  displaySurvivor: string;
  displayAbsorbed: string;
  valueSurvivor: any;
  valueAbsorbed: any;
  survivorLabel: 'A' | 'B';
  absorbedLabel: 'A' | 'B';
  type: 'conflict' | 'autofill' | 'identical';
}

type Step = 'select' | 'preview' | 'result';

function formatName(person: { firstName: string | null; lastName: string | null }): string {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

export default function MergePeoplePage() {
  const [step, setStep] = useState<Step>('select');

  // Step 1: Selection
  const [personAId, setPersonAId] = useState<number | null>(null);
  const [personAName, setPersonAName] = useState('');
  const [personBId, setPersonBId] = useState<number | null>(null);
  const [personBName, setPersonBName] = useState('');

  // Step 2: Preview
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, 'A' | 'B'>>({});
  const [survivorChoice, setSurvivorChoice] = useState<'A' | 'B' | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 3: Result
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);

  // Compute display fields dynamically based on survivorChoice
  const displayFields = useMemo(() => {
    if (!preview || !survivorChoice) return [] as DisplayField[];

    const results: DisplayField[] = [];

    for (const fc of preview.fieldComparisons) {
      const isSurvivorA = survivorChoice === 'A';
      const displaySurvivor = isSurvivorA ? fc.displayA : fc.displayB;
      const displayAbsorbed = isSurvivorA ? fc.displayB : fc.displayA;
      const valueSurvivor = isSurvivorA ? fc.valueA : fc.valueB;
      const valueAbsorbed = isSurvivorA ? fc.valueB : fc.valueA;

      const isDateField = fc.field === 'birthDate' || fc.field === 'deathDate';
      const survivorEmpty = isDateField ? !displaySurvivor : (valueSurvivor === null || valueSurvivor === undefined || valueSurvivor === '');
      const absorbedEmpty = isDateField ? !displayAbsorbed : (valueAbsorbed === null || valueAbsorbed === undefined || valueAbsorbed === '');

      let type: 'conflict' | 'autofill';

      if (fc.field === 'name') {
        type = 'conflict';
      } else if (survivorEmpty && !absorbedEmpty) {
        type = 'autofill';
      } else if (!survivorEmpty && absorbedEmpty) {
        continue; // Survivor already has it, skip
      } else if (!survivorEmpty && !absorbedEmpty) {
        const differ = isDateField
          ? displaySurvivor !== displayAbsorbed
          : String(valueSurvivor) !== String(valueAbsorbed);
        if (!differ) continue; // Identical, skip
        type = 'conflict';
      } else {
        continue; // Both empty, skip
      }

      results.push({
        field: fc.field,
        label: fc.label,
        displaySurvivor,
        displayAbsorbed,
        valueSurvivor,
        valueAbsorbed,
        survivorLabel: survivorChoice,
        absorbedLabel: survivorChoice === 'A' ? 'B' as const : 'A' as const,
        type,
      });
    }

    return results;
  }, [preview, survivorChoice]);

  // Compute stats dynamically based on survivorChoice
  const computedStats = useMemo(() => {
    if (!preview || !survivorChoice) return null;
    // The absorbed person's unique counts are what gets transferred
    const absorbedKey = survivorChoice === 'A' ? 'B' : 'A';
    const absorbed = preview.uniqueCounts[absorbedKey];
    return {
      sharedCastCount: preview.sharedCastCount,
      sharedCrewCount: preview.sharedCrewCount,
      ...absorbed,
    };
  }, [preview, survivorChoice]);

  const handlePreview = async () => {
    if (!personAId || !personBId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personAId, personBId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al generar preview');
      }

      const data: PreviewData = await response.json();
      setPreview(data);

      // Pre-select survivor
      const initialSurvivor = data.suggestedSurvivor === 'TIE' ? null :
        data.suggestedSurvivor === 'A' ? 'A' as const : 'B' as const;
      setSurvivorChoice(initialSurvivor);

      // Pre-select resolutions: default to the survivor's values for conflicts
      if (initialSurvivor) {
        const defaultResolutions: Record<string, 'A' | 'B'> = {};
        for (const fc of data.fieldComparisons) {
          if (fc.displayA && fc.displayB && fc.displayA !== fc.displayB) {
            defaultResolutions[fc.field] = initialSurvivor;
          }
        }
        setResolutions(defaultResolutions);
      } else {
        setResolutions({});
      }

      setStep('preview');
    } catch (error: any) {
      toast.error(error.message || 'Error al generar preview');
    } finally {
      setLoading(false);
    }
  };

  // When survivor changes, update default resolutions for conflicts
  const handleSurvivorChange = (choice: 'A' | 'B') => {
    setSurvivorChoice(choice);
    if (preview) {
      const newResolutions: Record<string, 'A' | 'B'> = {};
      for (const fc of preview.fieldComparisons) {
        // For fields where both have values and they differ, default to the survivor
        const isDateField = fc.field === 'birthDate' || fc.field === 'deathDate';
        const aEmpty = isDateField ? !fc.displayA : (fc.valueA === null || fc.valueA === undefined || fc.valueA === '');
        const bEmpty = isDateField ? !fc.displayB : (fc.valueB === null || fc.valueB === undefined || fc.valueB === '');
        if (!aEmpty && !bEmpty) {
          const differ = isDateField ? fc.displayA !== fc.displayB : String(fc.valueA) !== String(fc.valueB);
          if (differ) {
            // Keep any existing user choice, otherwise default to survivor
            newResolutions[fc.field] = resolutions[fc.field] || choice;
          }
        }
      }
      setResolutions(newResolutions);
    }
  };

  const handleMerge = async () => {
    if (!preview || !personAId || !personBId) return;

    // Check all conflicts are resolved
    const unresolvedConflicts = displayFields
      .filter(f => f.type === 'conflict' && !resolutions[f.field]);
    if (unresolvedConflicts.length > 0) {
      toast.error(`Hay ${unresolvedConflicts.length} conflicto(s) sin resolver`);
      return;
    }

    // Check survivor is chosen
    if (!survivorChoice) {
      toast.error('Elegí cuál persona sobrevive');
      return;
    }

    setLoading(true);
    try {
      const survivorId = survivorChoice === 'B' ? personBId : personAId;

      const response = await fetch('/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personAId,
          personBId,
          survivorId,
          resolutions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al ejecutar merge');
      }

      const result: MergeResult = await response.json();
      setMergeResult(result);
      setStep('result');
      toast.success('Merge completado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al ejecutar merge');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep('select');
    setPersonAId(null);
    setPersonAName('');
    setPersonBId(null);
    setPersonBName('');
    setPreview(null);
    setResolutions({});
    setSurvivorChoice(null);
    setMergeResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/people"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Personas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Merge className="h-8 w-8 text-gray-700" />
            Merge de Personas
          </h1>
          <p className="mt-2 text-gray-600">
            Unir dos registros de persona duplicados en uno solo
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-8">
          {['Seleccionar', 'Previsualizar', 'Resultado'].map((label, i) => {
            const stepNames: Step[] = ['select', 'preview', 'result'];
            const isActive = step === stepNames[i];
            const isCompleted = stepNames.indexOf(step) > i;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 2 && <ArrowRight className="w-4 h-4 text-gray-300 ml-2" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Select */}
        {step === 'select' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Seleccioná las dos personas a mergear</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona A
                </label>
                <PersonSearchInput
                  value={personAId || undefined}
                  initialPersonName={personAName}
                  onChange={(id, name) => {
                    setPersonAId(id);
                    setPersonAName(name || '');
                  }}
                  placeholder="Buscar persona A..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona B
                </label>
                <PersonSearchInput
                  value={personBId || undefined}
                  initialPersonName={personBName}
                  onChange={(id, name) => {
                    setPersonBId(id);
                    setPersonBName(name || '');
                  }}
                  placeholder="Buscar persona B..."
                />
              </div>
            </div>

            {personAId && personBId && personAId === personBId && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                No se puede mergear una persona consigo misma
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handlePreview}
                disabled={!personAId || !personBId || personAId === personBId || loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Previsualizar
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div className="space-y-6">
            {/* Survivor selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Persona que sobrevive</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SurvivorCard
                  person={preview.personA}
                  label="A"
                  isSelected={survivorChoice === 'A'}
                  isSuggested={preview.suggestedSurvivor === 'A'}
                  onClick={() => handleSurvivorChange('A')}
                />
                <SurvivorCard
                  person={preview.personB}
                  label="B"
                  isSelected={survivorChoice === 'B'}
                  isSuggested={preview.suggestedSurvivor === 'B'}
                  onClick={() => handleSurvivorChange('B')}
                />
              </div>
              {preview.suggestedSurvivor === 'TIE' && !survivorChoice && (
                <p className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                  Ambas personas tienen la misma cantidad de películas. Elegí cuál querés que sobreviva.
                </p>
              )}
            </div>

            {/* Conflicts / Data resolution */}
            {survivorChoice && displayFields.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Resolución de datos</h2>
                <div className="space-y-4">
                  {displayFields.map((df) => (
                    <FieldRow
                      key={df.field}
                      displayField={df}
                      resolution={resolutions[df.field]}
                      onResolve={(choice) => {
                        setResolutions(prev => ({ ...prev, [df.field]: choice }));
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            {survivorChoice && computedStats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Relaciones a transferir</h2>
                <StatsDisplay
                  stats={computedStats}
                  absorbedName={formatName(survivorChoice === 'A' ? preview.personB : preview.personA)}
                  survivorName={formatName(survivorChoice === 'A' ? preview.personA : preview.personB)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('select')}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                onClick={handleMerge}
                disabled={loading || !survivorChoice}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Merge className="w-4 h-4" />
                )}
                Aplicar Merge
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && mergeResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900">Merge completado</h2>
              <p className="text-gray-600 mt-2">
                La persona #{mergeResult.absorbedId} fue absorbida por la persona #{mergeResult.survivorId}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-700 mb-3">Resumen</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(mergeResult.stats).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{formatStatLabel(key)}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href={`/admin/people/${mergeResult.survivorId}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4" />
                Ver persona resultante
              </Link>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Merge className="w-4 h-4" />
                Hacer otro merge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function SurvivorCard({
  person,
  label,
  isSelected,
  isSuggested,
  onClick,
}: {
  person: PersonData;
  label: string;
  isSelected: boolean;
  isSuggested: boolean;
  onClick: () => void;
}) {
  const name = formatName(person);
  return (
    <button
      onClick={onClick}
      className={`
        p-4 rounded-lg border-2 text-left transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {person.photoUrl ? (
          <img src={person.photoUrl} alt={name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-medium">
            {(person.firstName?.[0] || person.lastName?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {label}
            </span>
            <span className="font-semibold text-gray-900 truncate">{name}</span>
            {isSuggested && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                Sugerida
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            ID: {person.id} &middot; {person.movieCount} película{person.movieCount !== 1 ? 's' : ''}
            <span className="text-xs ml-1">
              ({person._count.castRoles} cast, {person._count.crewRoles} crew)
            </span>
          </div>
          {person.alternativeNames.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Alt: {person.alternativeNames.map(a => a.fullName).join(', ')}
            </div>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 text-xs font-medium text-blue-600">
          ✓ Esta persona sobrevive
        </div>
      )}
    </button>
  );
}

function FieldRow({
  displayField,
  resolution,
  onResolve,
}: {
  displayField: DisplayField;
  resolution?: 'A' | 'B';
  onResolve: (choice: 'A' | 'B') => void;
}) {
  const { field, label, type, displaySurvivor, displayAbsorbed, absorbedLabel } = displayField;

  if (type === 'autofill') {
    // Absorbed has value, survivor doesn't - will be auto-copied
    return (
      <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700 w-40 flex-shrink-0">{label}</span>
        <span className="text-sm text-green-700">
          Se copiará de {absorbedLabel}: {field === 'photo' ? (
            <img src={displayAbsorbed} alt="" className="w-8 h-8 rounded inline-block ml-1 object-cover" />
          ) : (
            <span className="font-medium">{displayAbsorbed}</span>
          )}
        </span>
      </div>
    );
  }

  // Conflict - both have different values, user must choose
  // Map back to A/B display values (radio buttons always show A left, B right)
  const displayForA = displayField.survivorLabel === 'A' ? displayField.displaySurvivor : displayField.displayAbsorbed;
  const displayForB = displayField.survivorLabel === 'B' ? displayField.displaySurvivor : displayField.displayAbsorbed;
  const isPhoto = field === 'photo';
  const isBiography = field === 'biography';

  function renderValue(display: string, side: string) {
    if (isPhoto) {
      return display ? (
        <img src={display} alt="" className="w-16 h-16 rounded object-cover mt-1" />
      ) : <span className="text-sm text-gray-400 block">Sin foto</span>;
    }
    if (isBiography) {
      return <p className="text-sm text-gray-800 mt-1 line-clamp-3">{display || '(vacío)'}</p>;
    }
    return <span className="text-sm text-gray-800 block mt-0.5">{display || '(vacío)'}</span>;
  }

  return (
    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700 block mb-2">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <label className={`
          flex items-start gap-2 p-2 rounded cursor-pointer border transition-colors
          ${resolution === 'A' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
        `}>
          <input
            type="radio"
            name={`conflict-${field}`}
            checked={resolution === 'A'}
            onChange={() => onResolve('A')}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs text-gray-500">Persona A</span>
            {renderValue(displayForA, 'A')}
          </div>
        </label>

        <label className={`
          flex items-start gap-2 p-2 rounded cursor-pointer border transition-colors
          ${resolution === 'B' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
        `}>
          <input
            type="radio"
            name={`conflict-${field}`}
            checked={resolution === 'B'}
            onChange={() => onResolve('B')}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs text-gray-500">Persona B</span>
            {renderValue(displayForB, 'B')}
          </div>
        </label>
      </div>
    </div>
  );
}

function StatsDisplay({ stats, absorbedName, survivorName }: {
  stats: {
    sharedCastCount: number;
    sharedCrewCount: number;
    castToTransfer: number;
    crewToTransfer: number;
    altNamesToAdd: number;
    linksToTransfer: number;
    nationalitiesToAdd: number;
    imageAppearances: number;
    awards: number;
    festivalJury: number;
    festivalAwardWinners: number;
    pageViews: number;
  };
  absorbedName: string;
  survivorName: string;
}) {
  const deduplicateRows = [
    { label: 'Cast en películas compartidas', value: stats.sharedCastCount },
    { label: 'Crew en películas compartidas', value: stats.sharedCrewCount },
  ].filter(r => r.value > 0);

  const transferRows = [
    { label: 'Cast a transferir', value: stats.castToTransfer },
    { label: 'Crew a transferir', value: stats.crewToTransfer },
    { label: 'Nombres alternativos a agregar', value: stats.altNamesToAdd },
    { label: 'Links a transferir', value: stats.linksToTransfer },
    { label: 'Nacionalidades a agregar', value: stats.nationalitiesToAdd },
    { label: 'Apariciones en imágenes', value: stats.imageAppearances },
    { label: 'Premios a reasignar', value: stats.awards },
    { label: 'Jurados de festival', value: stats.festivalJury },
    { label: 'Premios de festival', value: stats.festivalAwardWinners },
    { label: 'Page views', value: stats.pageViews },
  ].filter(r => r.value > 0);

  if (deduplicateRows.length === 0 && transferRows.length === 0) {
    return <p className="text-sm text-gray-500">No hay relaciones para transferir ni deduplicar.</p>;
  }

  return (
    <div className="space-y-4">
      {deduplicateRows.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Se eliminan (duplicados)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deduplicateRows.map((row) => (
              <div key={row.label} className="flex justify-between items-center p-2 bg-yellow-50 rounded text-sm">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-semibold text-yellow-600">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {transferRows.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Se transfieren a {survivorName}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {transferRows.map((row) => (
              <div key={row.label} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-semibold text-blue-600">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    castRolesTransferred: 'Cast transferidos',
    castRolesDeleted: 'Cast deduplicados',
    crewRolesTransferred: 'Crew transferidos',
    crewRolesDeleted: 'Crew deduplicados',
    linksTransferred: 'Links transferidos',
    nationalitiesAdded: 'Nacionalidades agregadas',
    imageAppearancesTransferred: 'Imágenes transferidas',
    awardsReassigned: 'Premios reasignados',
    festivalJuryReassigned: 'Jurados reasignados',
    festivalAwardWinnersReassigned: 'Premios festival reasignados',
    pageViewsReassigned: 'Page views reasignados',
  };
  return labels[key] || key;
}
