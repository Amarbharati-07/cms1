import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCandidateAttendance, useCandidateMarkAttendance } from "@/hooks/use-candidate";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Loader2, MapPin, Camera, CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function secureFileUrl(url: string): string {
  return url?.replace('/uploads/', '/api/files/') ?? url;
}

export default function CandidateAttendance() {
  const { data: logs, isLoading: loadingLogs } = useCandidateAttendance();
  const { mutateAsync: markAttendance, isPending } = useCandidateMarkAttendance();
  const { latitude, longitude, address, error: geoError, loading: geoLoading, retry } = useGeolocation();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const openCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(s);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      }, 50);
    } catch {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Please allow camera permission." });
    }
  }, [toast]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    canvas.toBlob((blob) => {
      if (blob) {
        setPhoto(new File([blob], "attendance.jpg", { type: "image/jpeg" }));
      }
    }, "image/jpeg", 0.92);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
  }, [stream]);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
    setPreview(null);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
    openCamera();
  }, [stream, openCamera]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async () => {
    if (!photo) {
      toast({ variant: "destructive", title: "Photo required", description: "Please take a live selfie first" });
      return;
    }
    if (!latitude || !longitude) {
      toast({ variant: "destructive", title: "Location required", description: geoError || "Please allow location access and wait for GPS lock" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      if (address) {
        formData.append("locationArea", address.area);
        formData.append("locationCity", address.city);
        formData.append("locationState", address.state);
        formData.append("locationPincode", address.pincode);
        formData.append("locationAddress", address.fullAddress);
      }

      await markAttendance(formData);
      toast({ title: "Attendance marked!", description: "Your check-in has been recorded." });
      setPhoto(null);
      setPreview(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    }
  };

  const todayLog = logs?.find((l: any) => new Date(l.timestamp).toDateString() === new Date().toDateString());

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold font-display text-gradient mb-2">Attendance Check-in</h1>
          <p className="text-muted-foreground">Take a live selfie and confirm your location to mark attendance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-panel border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary" />
            <CardHeader>
              <CardTitle>Daily Check-in</CardTitle>
              <CardDescription>Take a live selfie to verify your attendance today.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {todayLog ? (
                <div className="p-8 text-center bg-green-500/10 rounded-xl border border-green-500/20">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-400 mb-2">You're checked in for today!</h3>
                  <p className="text-sm text-green-400/80">Logged at {format(new Date(todayLog.timestamp), 'h:mm a')}</p>
                  {(todayLog.locationCity || todayLog.locationArea) && (
                    <p className="text-xs text-green-400/60 mt-1">
                      {[todayLog.locationArea, todayLog.locationCity].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Camera / Photo Section */}
                  <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center overflow-hidden relative">
                    {cameraOpen ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                          <Button
                            size="lg"
                            className="rounded-full w-16 h-16 p-0 bg-white text-black hover:bg-white/90 shadow-xl border-4 border-white/50"
                            onClick={capturePhoto}
                            data-testid="button-capture-photo"
                          >
                            <Camera className="w-7 h-7" />
                          </Button>
                        </div>
                      </>
                    ) : preview ? (
                      <>
                        <img src={preview} alt="Selfie preview" className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm"
                            onClick={retakePhoto}
                            data-testid="button-retake-photo"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" /> Retake
                          </Button>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="text-xs bg-green-500/80 text-white px-2 py-1 rounded-full font-medium">✓ Photo captured</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center px-6">
                        <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                          <Camera className="w-10 h-10" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">Take a Live Selfie</p>
                          <p className="text-xs text-muted-foreground mt-1">Your face must be clearly visible</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={openCamera}
                            className="bg-primary hover:bg-primary/90"
                            data-testid="button-open-camera"
                          >
                            <Camera className="w-4 h-4 mr-2" /> Open Camera
                          </Button>
                          <label className="cursor-pointer">
                            <Button variant="outline" asChild>
                              <span className="text-xs">Upload Photo</span>
                            </Button>
                            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Location Section */}
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" /> Live Location
                      </span>
                      <Button variant="ghost" size="sm" onClick={retry} disabled={geoLoading} className="h-8 gap-1.5">
                        <RefreshCw className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                    </div>
                    {geoLoading ? (
                      <p className="text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Acquiring your exact location...
                      </p>
                    ) : geoError ? (
                      <p className="text-xs text-red-400">{geoError}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {address ? (
                          <div className="text-xs space-y-0.5">
                            {(address.area || address.city) && (
                              <p className="text-green-300 font-semibold text-sm">
                                {[address.area, address.city].filter(Boolean).join(", ")}
                              </p>
                            )}
                            {address.state && (
                              <p className="text-muted-foreground">
                                {address.state}{address.pincode ? ` — ${address.pincode}` : ""}
                              </p>
                            )}
                            {address.fullAddress && (
                              <p className="text-muted-foreground/60 text-[11px] leading-relaxed">{address.fullAddress}</p>
                            )}
                          </div>
                        ) : null}
                        <p className="text-xs font-mono text-green-400/50">
                          {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/25"
                    onClick={onSubmit}
                    disabled={isPending || !photo || !latitude || geoLoading}
                    data-testid="button-submit-attendance"
                  >
                    {isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                    {isPending ? "Submitting..." : "Confirm Check-in"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle>Recent History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {logs?.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="w-14 h-14 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-white/10">
                        {log.photoUrl ? (
                          <img src={secureFileUrl(log.photoUrl)} className="w-full h-full object-cover" alt="attendance" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Camera className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{format(new Date(log.timestamp), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'h:mm a')}</p>
                        {(log.locationArea || log.locationCity) && (
                          <p className="text-xs text-blue-400/80 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {[log.locationArea, log.locationCity].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {logs?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No attendance records yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
