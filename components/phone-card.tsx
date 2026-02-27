'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    User,
    History,
    Edit,
    Check,
    X
} from 'lucide-react';

interface PhoneNumber {
    id: string;
    number: string;
    currentStatus: 'KOSONG' | 'PAKAI';
    currentClient: string | null;
    createdAt: string;
    updatedAt: string;
    history: HistoryEntry[];
}

interface HistoryEntry {
    id: string;
    phoneId: string;
    eventType: 'ACTIVATION' | 'ASSIGNED' | 'DEASSIGNED' | 'REASSIGNED';
    clientName: string | null;
    eventDate: string;
    notes: string | null;
}

interface PhoneCardProps {
    phone: PhoneNumber;
    isSelected: boolean;
    onSelect: () => void;
    onViewDetails: () => void;
    onEdit: () => void;
    onQuickAssign: () => void;
}

export function PhoneCard({
    phone,
    isSelected,
    onSelect,
    onViewDetails,
    onEdit,
    onQuickAssign,
}: PhoneCardProps) {
    return (
        <div
            className={`
                flex items-center justify-between px-3 py-2 rounded-md border transition-all cursor-pointer
                ${isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }
                ${phone.currentStatus === 'PAKAI'
                    ? 'border-l-2 border-l-green-500'
                    : 'border-l-2 border-l-yellow-500'
                }
            `}
            onClick={onSelect}
        >
            {/* Left side - Phone number and status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Selection checkbox */}
                <div className={`
                    w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}
                `}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>

                {/* Phone number */}
                <span className="font-mono text-sm font-medium truncate">
                    {phone.number}
                </span>

                {/* Status badge */}
                <Badge
                    variant={phone.currentStatus === 'PAKAI' ? 'success' : 'secondary'}
                    className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0"
                >
                    {phone.currentStatus === 'PAKAI' ? '📱' : '✅'}
                </Badge>

                {/* Client name (only if assigned) */}
                {phone.currentClient && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        → {phone.currentClient}
                    </span>
                )}
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails();
                    }}
                    title="View History"
                >
                    <History className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    title="Edit"
                >
                    <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAssign();
                    }}
                    title={phone.currentStatus === 'KOSONG' ? 'Assign' : 'Deassign'}
                >
                    {phone.currentStatus === 'KOSONG' ? (
                        <User className="h-3.5 w-3.5" />
                    ) : (
                        <X className="h-3.5 w-3.5" />
                    )}
                </Button>
            </div>
        </div>
    );
}
