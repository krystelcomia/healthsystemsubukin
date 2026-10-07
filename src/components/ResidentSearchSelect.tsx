import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, User, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ResidentItem {
  id: string;
  full_name?: string | null;
  sitio?: string | null;
  birthday?: string | null;
  age?: number | string | null;
  gender?: string | null;
  family_number?: string | null;
  [key: string]: any;
}

interface ResidentSearchSelectProps {
  residents: ResidentItem[];
  value: string;
  onValueChange: (residentId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  variant?: "underline" | "outline";
  customSubtitle?: (resident: ResidentItem) => string;
}

export const ResidentSearchSelect: React.FC<ResidentSearchSelectProps> = ({
  residents,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Search a resident...",
  searchPlaceholder = "Search a resident by name or sitio...",
  className,
  triggerClassName,
  variant = "underline",
  customSubtitle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedResident = useMemo(() => {
    if (!value) return null;
    return residents.find((r) => r.id === value) || null;
  }, [residents, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsChanging(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter residents based on search query (only when user types a query)
  const filteredResidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return []; // The list of residents is not displayed when no query is typed to avoid clutter

    return residents.filter((r) => {
      const rawName = (r.full_name || "").toLowerCase();
      const sitio = (r.sitio || "").toLowerCase();
      const famNum = (r.family_number || "").toLowerCase();
      return rawName.includes(q) || sitio.includes(q) || famNum.includes(q);
    });
  }, [residents, searchQuery]);

  const handleSelect = (id: string) => {
    onValueChange(id);
    setIsDropdownOpen(false);
    setIsChanging(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
    setSearchQuery("");
    setIsChanging(true);
    setIsDropdownOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const selectedName = selectedResident?.full_name || "";

  return (
    <div className={cn("w-full relative space-y-1", className)} ref={containerRef}>
      {/* Screen Interactive Search & Selection */}
      <div className="no-print relative">
        {selectedResident && !isChanging ? (
          /* Selected Resident View */
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-lg transition-all text-xs",
              variant === "underline"
                ? "border-b-2 border-t-0 border-x-0 border-primary bg-primary/5 rounded-none px-1 py-1.5"
                : "border border-primary/40 bg-primary/5 shadow-xs"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm truncate flex items-center gap-1.5">
                  <span>{selectedName}</span>
                  {selectedResident.family_number && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono font-normal">
                      {selectedResident.family_number}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                  {selectedResident.sitio && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5 text-primary" />
                      {selectedResident.sitio}
                    </span>
                  )}
                  {selectedResident.age !== undefined && selectedResident.age !== null && selectedResident.age !== "" && (
                    <span>• Age {selectedResident.age}</span>
                  )}
                  {selectedResident.gender && <span>• {selectedResident.gender}</span>}
                  {customSubtitle && <span>• {customSubtitle(selectedResident)}</span>}
                </div>
              </div>
            </div>

            {!disabled && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsChanging(true);
                    setSearchQuery("");
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1 font-medium"
                >
                  <Search className="h-3 w-3" />
                  <span>Change</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Clear resident"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Search Input Field - Clean & Uncluttered */
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              disabled={disabled}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              placeholder={searchPlaceholder || placeholder}
              className={cn(
                "pl-8 pr-8 text-sm",
                variant === "underline"
                  ? "border-b-2 border-t-0 border-x-0 border-slate-300 dark:border-slate-600 bg-transparent rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary"
                  : "bg-background",
                triggerClassName
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsDropdownOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : isChanging && selectedResident ? (
              <button
                type="button"
                onClick={() => setIsChanging(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            ) : null}
          </div>
        )}

        {/* Search Results Dropdown - only shown when query is typed */}
        {isDropdownOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border border-border/80 rounded-lg shadow-lg z-50 overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 zoom-in-95">
            <div className="p-2 border-b border-border/40 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Found {filteredResidents.length} matching resident(s)</span>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="hover:text-foreground text-xs"
              >
                Close ✕
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-border/20 p-1 flex-1">
              {filteredResidents.length === 0 ? (
                <div className="p-5 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">No resident found</p>
                  <p className="text-[11px]">No matches for "{searchQuery}". Try searching by name or sitio.</p>
                </div>
              ) : (
                filteredResidents.map((r) => {
                  const isSelected = r.id === value;
                  const resName = r.full_name || "Unknown";
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelect(r.id)}
                      className={cn(
                        "p-2 rounded-md cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted/70 text-foreground"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium truncate text-sm">
                          <span>{resName}</span>
                          {r.family_number && (
                            <Badge
                              variant={isSelected ? "secondary" : "outline"}
                              className="text-[10px] py-0 px-1 font-mono font-normal"
                            >
                              {r.family_number}
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-[11px] flex items-center gap-1.5 mt-0.5 truncate",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {r.sitio && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {r.sitio}
                            </span>
                          )}
                          {r.age !== undefined && r.age !== null && r.age !== "" && (
                            <span>• Age {r.age}</span>
                          )}
                          {r.gender && <span>• {r.gender}</span>}
                          {customSubtitle && <span>• {customSubtitle(r)}</span>}
                        </div>
                      </div>

                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print representation (clean text with bottom underline) */}
      <span className="hidden print:block border-b-2 border-slate-300 w-full min-h-[1.5rem] px-1 font-medium text-sm text-black">
        {selectedName || "—"}
      </span>
    </div>
  );
};
