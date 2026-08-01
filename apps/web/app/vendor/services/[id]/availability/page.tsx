'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getServiceAvailability,
  createAvailabilityRule,
  deleteAvailabilityRule,
  createAvailabilityException,
  deleteAvailabilityException,
  AvailabilityRuleData,
  AvailabilityExceptionData,
} from '@/lib/api/availability';
import { getPublicServiceDetail, ServiceData } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  Trash2Icon,
  SparklesIcon,
  BanIcon,
  CheckCircle2Icon,
  UsersIcon,
} from 'lucide-react';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}`;
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function VendorServiceAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<ServiceData | null>(null);
  const [rules, setRules] = useState<AvailabilityRuleData[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityExceptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'exceptions'>('rules');

  // Rule Form State
  const [ruleWeekday, setRuleWeekday] = useState<number>(1); // Monday
  const [ruleStartTime, setRuleStartTime] = useState('09:00');
  const [ruleEndTime, setRuleEndTime] = useState('17:00');
  const [ruleCapacity, setRuleCapacity] = useState(1);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Exception Form State
  const [excDate, setExcDate] = useState('');
  const [excIsClosed, setExcIsClosed] = useState(true);
  const [excStartTime, setExcStartTime] = useState('09:00');
  const [excEndTime, setExcEndTime] = useState('17:00');
  const [excCapacity, setExcCapacity] = useState(1);
  const [isSubmittingExc, setIsSubmittingExc] = useState(false);

  useEffect(() => {
    loadData();
  }, [serviceId]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [serviceRes, availRes] = await Promise.all([
        getPublicServiceDetail(serviceId),
        getServiceAvailability(serviceId),
      ]);

      if (serviceRes.success && serviceRes.data) {
        setService(serviceRes.data);
      }

      if (availRes.success && availRes.data) {
        setRules(availRes.data.rules || []);
        setExceptions(availRes.data.exceptions || []);
      } else {
        toast.add({
          title: 'Error',
          description: availRes.error?.message || 'Failed to load availability data',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to connect to server',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    const startMinute = timeStringToMinutes(ruleStartTime);
    const endMinute = timeStringToMinutes(ruleEndTime);

    if (startMinute >= endMinute) {
      toast.add({
        title: 'Invalid Time Window',
        description: 'Start time must be earlier than end time.',
        type: 'error',
      });
      return;
    }

    setIsSubmittingRule(true);
    try {
      const res = await createAvailabilityRule(serviceId, {
        weekday: ruleWeekday,
        startMinute,
        endMinute,
        capacity: ruleCapacity,
      });

      if (res.success && res.data) {
        const newRule = res.data;
        toast.add({
          title: 'Rule Added',
          description: 'Weekly availability window saved successfully.',
          type: 'success',
        });
        setRules((prev) => [...prev, newRule]);
      } else {
        toast.add({
          title: 'Failed to Add Rule',
          description: res.error?.message || 'Check inputs and try again.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to save availability rule',
        type: 'error',
      });
    } finally {
      setIsSubmittingRule(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      const res = await deleteAvailabilityRule(ruleId);
      if (res.success) {
        toast.add({
          title: 'Rule Deleted',
          description: 'Availability rule removed.',
          type: 'success',
        });
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      } else {
        toast.add({
          title: 'Error',
          description: res.error?.message || 'Failed to delete rule',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to delete rule',
        type: 'error',
      });
    }
  }

  async function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!excDate) {
      toast.add({
        title: 'Date Required',
        description: 'Please select a date for the exception.',
        type: 'error',
      });
      return;
    }

    const startMinute = timeStringToMinutes(excStartTime);
    const endMinute = timeStringToMinutes(excEndTime);

    if (!excIsClosed && startMinute >= endMinute) {
      toast.add({
        title: 'Invalid Time Window',
        description: 'Start time must be earlier than end time.',
        type: 'error',
      });
      return;
    }

    setIsSubmittingExc(true);
    try {
      const res = await createAvailabilityException(serviceId, {
        date: excDate,
        isClosed: excIsClosed,
        startMinute: excIsClosed ? undefined : startMinute,
        endMinute: excIsClosed ? undefined : endMinute,
        capacity: excIsClosed ? undefined : excCapacity,
      });

      if (res.success && res.data) {
        const newExc = res.data;
        toast.add({
          title: 'Exception Added',
          description: 'Date exception saved successfully.',
          type: 'success',
        });
        setExceptions((prev) => [...prev, newExc]);
        setExcDate('');
      } else {
        toast.add({
          title: 'Failed to Add Exception',
          description: res.error?.message || 'Check inputs and try again.',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to save date exception',
        type: 'error',
      });
    } finally {
      setIsSubmittingExc(false);
    }
  }

  async function handleDeleteException(exceptionId: string) {
    try {
      const res = await deleteAvailabilityException(exceptionId);
      if (res.success) {
        toast.add({
          title: 'Exception Deleted',
          description: 'Date exception removed.',
          type: 'success',
        });
        setExceptions((prev) => prev.filter((e) => e.id !== exceptionId));
      } else {
        toast.add({
          title: 'Error',
          description: res.error?.message || 'Failed to delete exception',
          type: 'error',
        });
      }
    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err?.message || 'Failed to delete exception',
        type: 'error',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/vendor/services"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Back to My Services</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-primary" />
              <span>Availability Management</span>
            </h1>
            {service && (
              <p className="text-sm text-muted-foreground mt-1">
                Service: <strong>{service.title}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
            <Button
              variant={activeTab === 'rules' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('rules')}
              className="font-bold text-xs gap-1.5"
            >
              <ClockIcon className="w-3.5 h-3.5" />
              <span>Weekly Rules ({rules.length})</span>
            </Button>
            <Button
              variant={activeTab === 'exceptions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('exceptions')}
              className="font-bold text-xs gap-1.5"
            >
              <BanIcon className="w-3.5 h-3.5" />
              <span>Date Exceptions ({exceptions.length})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-8">
          {/* Add Rule Form */}
          <Card className="p-6 border-border bg-card shadow-xs rounded-2xl">
            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-primary" />
                <span>Add Weekly Working Window</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Define open hours per day of week and slot capacity (how many bookings can share one slot).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Day of Week</label>
                  <select
                    value={ruleWeekday}
                    onChange={(e) => setRuleWeekday(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                  >
                    {WEEKDAYS.map((day, idx) => (
                      <option key={day} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Start Time</label>
                  <input
                    type="time"
                    value={ruleStartTime}
                    onChange={(e) => setRuleStartTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">End Time</label>
                  <input
                    type="time"
                    value={ruleEndTime}
                    onChange={(e) => setRuleEndTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Slot Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={ruleCapacity}
                    onChange={(e) => setRuleCapacity(Math.max(1, Number(e.target.value)))}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                    required
                  />
                </div>

                <div>
                  <Button type="submit" disabled={isSubmittingRule} className="w-full h-10 font-bold gap-1.5">
                    <PlusIcon className="w-4 h-4" />
                    <span>Add Window</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active Rules Grid by Weekday */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-primary" />
              <span>Current Weekly Schedule</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WEEKDAYS.map((dayName, weekdayIdx) => {
                const dayRules = rules.filter((r) => r.weekday === weekdayIdx);

                return (
                  <Card key={dayName} className="p-4 border-border bg-card rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        {dayName}
                      </span>
                      <Badge variant={dayRules.length > 0 ? 'default' : 'secondary'} className="text-[10px]">
                        {dayRules.length} window{dayRules.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {dayRules.length > 0 ? (
                      <div className="space-y-2">
                        {dayRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5 text-primary" />
                                <span>
                                  {minutesToTimeString(rule.startMinute)} – {minutesToTimeString(rule.endMinute)}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <UsersIcon className="w-3 h-3 text-muted-foreground" />
                                <span>Capacity: {rule.capacity} client{rule.capacity > 1 ? 's' : ''}/slot</span>
                              </p>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-1">Closed (No weekly rules set)</p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Date Exceptions Tab */}
      {activeTab === 'exceptions' && (
        <div className="space-y-8">
          {/* Add Exception Form */}
          <Card className="p-6 border-border bg-card shadow-xs rounded-2xl">
            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BanIcon className="w-5 h-5 text-primary" />
                <span>Add Specific Date Exception</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Override weekly schedule for holidays or one-off open dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleAddException} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Date</label>
                    <input
                      type="date"
                      value={excDate}
                      onChange={(e) => setExcDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Exception Mode</label>
                    <select
                      value={excIsClosed ? 'closed' : 'custom'}
                      onChange={(e) => setExcIsClosed(e.target.value === 'closed')}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                    >
                      <option value="closed">Closed Entire Day</option>
                      <option value="custom">Custom Open Window</option>
                    </select>
                  </div>
                </div>

                {!excIsClosed && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Custom Start Time</label>
                      <input
                        type="time"
                        value={excStartTime}
                        onChange={(e) => setExcStartTime(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Custom End Time</label>
                      <input
                        type="time"
                        value={excEndTime}
                        onChange={(e) => setExcEndTime(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Custom Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={excCapacity}
                        onChange={(e) => setExcCapacity(Math.max(1, Number(e.target.value)))}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" disabled={isSubmittingExc} className="font-bold gap-1.5">
                    <PlusIcon className="w-4 h-4" />
                    <span>Save Date Exception</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active Exceptions List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span>Configured Exceptions</span>
            </h3>

            {exceptions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exceptions.map((exc) => {
                  const dateFormatted = new Date(exc.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  });

                  return (
                    <Card key={exc.id} className="p-4 border-border bg-card rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{dateFormatted}</span>
                        <Badge variant={exc.isClosed ? 'destructive' : 'default'} className="text-[10px]">
                          {exc.isClosed ? 'CLOSED' : 'CUSTOM OPEN'}
                        </Badge>
                      </div>

                      {!exc.isClosed && exc.startMinute != null && exc.endMinute != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {minutesToTimeString(exc.startMinute)} – {minutesToTimeString(exc.endMinute)} (Cap: {exc.capacity})
                          </span>
                        </p>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteException(exc.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1 px-2 text-xs"
                        >
                          <Trash2Icon className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed border-2 border-border bg-card rounded-2xl">
                <p className="text-sm text-muted-foreground">No date exceptions configured.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
