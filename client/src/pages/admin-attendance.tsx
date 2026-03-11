import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminAttendance } from "@/hooks/use-admin";
import { format } from "date-fns";
import { CalendarCheck, MapPin, Clock, User, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function secureFileUrl(url: string): string {
  return url?.replace('/uploads/', '/api/files/') ?? url;
}

export default function AdminAttendance() {
  const { data: attendanceLogs, isLoading } = useAdminAttendance();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient mb-2">Attendance Logs</h1>
          <p className="text-muted-foreground">View field team check-ins, photos, and exact locations.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-card border border-white/5 animate-pulse" />)}
          </div>
        ) : (
          <Card className="glass-panel border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {attendanceLogs?.map((log: any) => (
                <div
                  key={log.id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 hover:bg-white/[0.02] transition-colors"
                  data-testid={`attendance-row-${log.id}`}
                >
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-xl bg-muted border border-white/10 shrink-0 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-0">
                      <CalendarCheck className="w-6 h-6 text-muted-foreground" />
                    </div>
                    {log.photoUrl && (
                      <img
                        src={secureFileUrl(log.photoUrl)}
                        alt={`${log.candidateProfile?.fullName || "Candidate"} check-in`}
                        className="w-full h-full object-cover relative z-10"
                        data-testid={`img-attendance-${log.id}`}
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {/* Name + badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base flex items-center gap-1.5" data-testid={`text-candidate-name-${log.id}`}>
                        <User className="w-4 h-4 text-muted-foreground" />
                        {log.candidateProfile?.fullName || `Candidate #${log.candidateId}`}
                      </h3>
                      <Badge variant="outline" className="text-xs font-normal border-green-500/30 text-green-400 bg-green-500/5">
                        Verified
                      </Badge>
                    </div>

                    {/* Time */}
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5" data-testid={`text-time-${log.id}`}>
                      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                      {format(new Date(log.timestamp), 'PPpp')}
                    </p>

                    {/* Location */}
                    {(log.locationAddress || log.locationCity || log.latitude) ? (
                      <div className="mt-1 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg space-y-1">
                        <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5" /> Check-in Location
                        </p>
                        {(log.locationArea || log.locationCity) && (
                          <p className="text-sm font-medium text-foreground" data-testid={`text-location-city-${log.id}`}>
                            {[log.locationArea, log.locationCity].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {log.locationState && (
                          <p className="text-xs text-muted-foreground">
                            {log.locationState}{log.locationPincode ? ` — ${log.locationPincode}` : ""}
                          </p>
                        )}
                        {log.locationAddress && (
                          <p className="text-xs text-muted-foreground/70 leading-relaxed">{log.locationAddress}</p>
                        )}
                        {log.latitude && log.longitude && (
                          <p className="text-xs font-mono text-muted-foreground/40 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                    ) : log.latitude && log.longitude ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-green-400" />
                        {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}

              {attendanceLogs?.length === 0 && (
                <div className="p-16 text-center text-muted-foreground">
                  <CalendarCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-1">No attendance records</p>
                  <p className="text-sm">Check-ins will appear here once candidates mark their attendance.</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
