'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clientService } from '@/services/client.service'
import type { GeocodingCandidate } from '@/interfaces/client.interface'

interface GeocodingDialogProps { open: boolean; clientId: string | null; clientName?: string; address?: string; onOpenChange: (open: boolean) => void; onConfirmed?: () => void }

export function GeocodingDialog({ open, clientId, clientName, address, onOpenChange, onConfirmed }: GeocodingDialogProps) {
  const [query, setQuery] = useState(address ?? ''); const [candidates, setCandidates] = useState<GeocodingCandidate[]>([]); const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle'); const [error, setError] = useState('')
  useEffect(() => { if (open) { setQuery(address ?? ''); setCandidates([]); setStatus('idle'); setError('') } }, [open, address])
  const search = async () => { if (clientId === null || query.trim() === '') { setError('Ingresá una dirección para buscar.'); setStatus('error'); return }; setStatus('loading'); setError(''); try { const result = await clientService.geocode(clientId, query.trim()); setCandidates(result.candidates); setStatus('idle') } catch { setStatus('error'); setError('El proveedor de geocodificación no está disponible. Intentá nuevamente.') } }
  const confirm = async (candidate: GeocodingCandidate) => { if (clientId === null) return; setStatus('loading'); try { await clientService.confirmLocation(clientId, { candidate }); setStatus('success'); onConfirmed?.() } catch { setStatus('error'); setError('No se pudo confirmar la ubicación.') } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Confirmar ubicación{clientName ? `: ${clientName}` : ''}</DialogTitle><DialogDescription>Buscá candidatos y confirmá explícitamente una ubicación. Sin candidatos, la ruta queda bloqueada y no se inventan coordenadas.</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label htmlFor="geocoding-address">Dirección</Label><div className="flex gap-2"><Input id="geocoding-address" value={query} onChange={(e) => setQuery(e.target.value)} /><Button type="button" onClick={() => void search()} disabled={status === 'loading'}>Buscar</Button></div></div>{status === 'error' && <p role="alert" className="text-sm text-state-error">{error}</p>}{status === 'success' && <p role="status" className="text-sm text-state-success">Ubicación confirmada. Actualizá el dashboard para habilitar la ruta.</p>}{status !== 'success' && candidates.length === 0 && status === 'idle' && <p role="status" className="text-sm text-text-secondary">No hay candidatos todavía. Si la búsqueda no devuelve resultados, el destino seguirá bloqueado hasta contar con una ubicación válida.</p>}{candidates.length > 0 && <ul aria-label="Candidatos de geocodificación" className="grid gap-2">{candidates.map((candidate) => <li key={candidate.placeId} className="rounded-md border border-border-subtle p-3"><p className="text-sm text-text-primary">{candidate.formattedAddress}</p><p className="text-xs text-text-secondary">Precisión: {candidate.precision}</p><Button type="button" size="sm" className="mt-2" onClick={() => void confirm(candidate)} disabled={status === 'loading'}>Confirmar esta ubicación</Button></li>)}</ul>}<DialogFooter><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button></DialogFooter></div></DialogContent></Dialog>
}
