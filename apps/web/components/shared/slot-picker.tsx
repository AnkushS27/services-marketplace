'use client';

import React, { useState, useEffect } from 'react';
import {
  getServiceSlots,
  getNextAvailableSlot,
  DerivedSlotData,
} from '@/lib/api/availability';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  UsersIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from 'lucide-react';

interface SlotPickerProps {
  serviceId: string;
  offeringId: string;
  onSelectSlot?: (slot: DerivedSlotData) => void;
  selectedSlot?: DerivedSlotData | null;
}

export function SlotPicker({
  serviceId,
  offeringId,
  onSelectSlot,
  selectedSlot,
}: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [slots, setSlots] = useState<DerivedSlotData[]>([]);
  const [nextAvailable, setNextAvailable] = useState<DerivedSlotData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNextLoading, setIsNextLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load next available slot when offering changes
  useEffect(() => {
    async function loadNextAvailable() {
      if (!serviceId || !offeringId) return;
      setIsNextLoading(true);
      try {
        const res = await getNextAvailableSlot(serviceId, offeringId);
        if (res.success && res.data) {
          setNextAvailable(res.data);
          // If current selectedDate has no slots, pre-set date to next available slot's date
          const nextDateStr = new Date(res.data.slotStart)
            .toISOString()
            .split('T')[0];
          setSelectedDate(nextDateStr);
        } else {
          setNextAvailable(null);
        }
      } catch (err) {
        setNextAvailable(null);
      } finally {
        setIsNextLoading(false);
      }
    }

    loadNextAvailable();
  }, [serviceId, offeringId]);

  // Load slots for selectedDate
  useEffect(() => {
    async function loadSlotsForDate() {
      if (!serviceId || !offeringId || !selectedDate) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await getServiceSlots(
          serviceId,
          offeringId,
          selectedDate,
          selectedDate,
        );

        if (res.success && res.data) {
          setSlots(res.data);
        } else {
          setError(res.error?.message || 'Failed to load available slots');
          setSlots([]);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to connect to server');
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadSlotsForDate();
  }, [serviceId, offeringId, selectedDate]);

  function formatSlotTime(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatFullDate(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Quick Date Selectors (Today, Tomorrow, +2 Days, +3 Days)
  const quickDates = Array.from({ length: 5 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const dateStr = d.toISOString().split('T')[0];
    const label =
      idx === 0
        ? 'Today'
        : idx === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    return { dateStr, label };
  });

  return (
    <div className="space-y-5">
      {/* Next Available Highlight Banner */}
      {nextAvailable && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary shrink-0" />
            <span>
              Earliest Available Slot:{' '}
              <strong>
                {formatFullDate(nextAvailable.slotStart)} at{' '}
                {formatSlotTime(nextAvailable.slotStart)}
              </strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] font-bold border-primary/40 text-primary hover:bg-primary/20"
            onClick={() => {
              const dStr = new Date(nextAvailable.slotStart)
                .toISOString()
                .split('T')[0];
              setSelectedDate(dStr);
              if (onSelectSlot) onSelectSlot(nextAvailable);
            }}
          >
            Select
          </Button>
        </div>
      )}

      {/* Date Picker Bar */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          1. Choose Date
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {quickDates.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <Button
                key={item.dateStr}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={`text-xs font-semibold rounded-xl ${
                  isSelected ? 'shadow-xs' : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedDate(item.dateStr)}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                <span>{item.label}</span>
              </Button>
            );
          })}

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 text-xs font-medium rounded-xl border border-border bg-background text-foreground"
          />
        </div>
      </div>

      {/* Slot Selection Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          2. Select Appointment Time
        </label>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-muted/60 border border-border"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((slot) => {
              const isSelected =
                selectedSlot?.slotStart === slot.slotStart ||
                (selectedSlot &&
                  new Date(selectedSlot.slotStart).getTime() ===
                    new Date(slot.slotStart).getTime());

              return (
                <Card
                  key={slot.slotStart}
                  className={`p-3.5 cursor-pointer rounded-xl border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                  onClick={() => onSelectSlot && onSelectSlot(slot)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5 text-primary" />
                      {formatSlotTime(slot.slotStart)}
                    </span>
                    {isSelected && (
                      <CheckCircle2Icon className="w-4 h-4 text-primary" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="w-3 h-3 text-muted-foreground" />
                      Cap: {slot.capacity}
                    </span>
                    <Badge
                      variant={slot.remaining === 1 ? 'outline' : 'secondary'}
                      className={`text-[10px] ${
                        slot.remaining === 1
                          ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                          : 'font-semibold'
                      }`}
                    >
                      {slot.remaining} spot{slot.remaining > 1 ? 's' : ''} left
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed border-2 border-border bg-card rounded-2xl space-y-2">
            <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Slots Available</p>
            <p className="text-xs text-muted-foreground">
              No open appointments found for {formatFullDate(selectedDate)}. Please choose another date.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
