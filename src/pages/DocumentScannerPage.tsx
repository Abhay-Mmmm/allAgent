import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';
import { ArrowLeft, Camera, Upload, X, CheckCircle, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';

type ScanStatus = 'idle' | 'capturing' | 'processing' | 'success' | 'error';

interface ScanResult {
    isAadhaar: boolean;
    confidence: number;
    extractedText: string;
    aadhaarNumber?: string;
}

export const DocumentScannerPage = () => {
    const { language, setLanguage } = useLanguage();
    const navigate = useNavigate();

    const [status, setStatus] = useState<ScanStatus>('idle');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleBack = useCallback(() => {
        navigate('/mobile');
    }, [navigate]);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraActive(true);
                setStatus('capturing');
            }
        } catch (error) {
            console.error('Camera error:', error);
            alert(language === 'hi' ? 'कैमरा एक्सेस नहीं मिला' : 'Could not access camera');
        }
    }, [language]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(imageData);
                stopCamera();
                processImage(imageData);
            }
        }
    }, [stopCamera]);

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target?.result as string;
                setCapturedImage(imageData);
                processImage(imageData);
            };
            reader.readAsDataURL(file);
        }
    };

    // Aadhaar validation patterns
    const validateAadhaar = (text: string): ScanResult => {
        const cleanText = text.replace(/\s+/g, ' ').toLowerCase();

        // Aadhaar number pattern: 12 digits (often in groups of 4)
        const aadhaarPattern = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
        const aadhaarMatches = text.match(aadhaarPattern);

        // Keywords that indicate Aadhaar
        const aadhaarKeywords = [
            'aadhaar', 'aadhar', 'आधार', 'uidai',
            'government of india', 'भारत सरकार',
            'unique identification', 'enrollment'
        ];

        const hasKeyword = aadhaarKeywords.some(keyword => cleanText.includes(keyword));
        const hasNumber = aadhaarMatches && aadhaarMatches.length > 0;

        // Calculate confidence
        let confidence = 0;
        if (hasKeyword) confidence += 50;
        if (hasNumber) confidence += 40;
        if (cleanText.includes('dob') || cleanText.includes('date of birth') || cleanText.includes('जन्म')) confidence += 10;

        const isAadhaar = confidence >= 50;

        return {
            isAadhaar,
            confidence: Math.min(confidence, 100),
            extractedText: text.substring(0, 500),
            aadhaarNumber: hasNumber ? aadhaarMatches[0].replace(/\s/g, '') : undefined,
        };
    };

    // Process image with OCR
    const processImage = async (imageData: string) => {
        setStatus('processing');
        setOcrProgress(0);

        try {
            const worker = await createWorker('eng+hin', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.round(m.progress * 100));
                    }
                },
            });

            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();

            const result = validateAadhaar(text);
            setScanResult(result);
            setStatus(result.isAadhaar ? 'success' : 'error');
        } catch (error) {
            console.error('OCR error:', error);
            setScanResult({
                isAadhaar: false,
                confidence: 0,
                extractedText: 'OCR failed',
            });
            setStatus('error');
        }
    };

    // Reset scanner
    const resetScanner = () => {
        setCapturedImage(null);
        setScanResult(null);
        setStatus('idle');
        setOcrProgress(0);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { stopCamera(); handleBack(); }}
                        className="p-2 rounded-xl hover:bg-secondary transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <span className="text-lg font-bold text-foreground">
                        {language === 'hi' ? 'दस्तावेज़ स्कैनर' : 'Document Scanner'}
                    </span>
                </div>
                <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
            </header>

            <main className="flex-1 p-4 space-y-4">
                {/* Instructions */}
                {status === 'idle' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">
                            {language === 'hi' ? 'आधार कार्ड स्कैन करें' : 'Scan Aadhaar Card'}
                        </h3>
                        <p className="text-blue-700 text-sm">
                            {language === 'hi'
                                ? 'कृपया अपने आधार कार्ड की फोटो लें या अपलोड करें। हम स्वचालित रूप से सत्यापित करेंगे।'
                                : 'Please take a photo or upload your Aadhaar card. We will automatically verify it.'}
                        </p>
                    </div>
                )}

                {/* Camera View */}
                {cameraActive && (
                    <div className="relative rounded-2xl overflow-hidden bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-64 object-cover"
                        />
                        <div className="absolute inset-0 border-4 border-dashed border-white/50 m-4 rounded-lg pointer-events-none" />
                        <button
                            onClick={capturePhoto}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                        >
                            <div className="w-12 h-12 bg-primary rounded-full" />
                        </button>
                    </div>
                )}

                {/* Hidden Canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {/* Captured Image Preview */}
                {capturedImage && (
                    <div className="relative rounded-2xl overflow-hidden">
                        <img src={capturedImage} alt="Captured document" className="w-full h-64 object-contain bg-slate-100" />
                        {status === 'processing' && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                <Loader2 className="w-10 h-10 text-white animate-spin mb-2" />
                                <p className="text-white font-medium">
                                    {language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'} {ocrProgress}%
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Result Display */}
                {scanResult && status !== 'processing' && (
                    <div className={`rounded-2xl p-5 ${scanResult.isAadhaar ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-red-50 border-2 border-red-500'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            {scanResult.isAadhaar ? (
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            )}
                            <div>
                                <h3 className={`font-bold text-lg ${scanResult.isAadhaar ? 'text-emerald-900' : 'text-red-900'}`}>
                                    {scanResult.isAadhaar
                                        ? (language === 'hi' ? '✓ आधार कार्ड सत्यापित' : '✓ Aadhaar Card Verified')
                                        : (language === 'hi' ? '✗ यह आधार कार्ड नहीं है' : '✗ Not an Aadhaar Card')}
                                </h3>
                                <p className={`text-sm ${scanResult.isAadhaar ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {language === 'hi' ? `विश्वास स्कोर: ${scanResult.confidence}%` : `Confidence: ${scanResult.confidence}%`}
                                </p>
                            </div>
                        </div>

                        {scanResult.aadhaarNumber && (
                            <div className="bg-white rounded-lg p-3 mt-3">
                                <p className="text-sm text-slate-500">
                                    {language === 'hi' ? 'आधार नंबर (मास्क्ड):' : 'Aadhaar Number (masked):'}
                                </p>
                                <p className="font-mono text-lg font-bold text-slate-900">
                                    XXXX XXXX {scanResult.aadhaarNumber.slice(-4)}
                                </p>
                            </div>
                        )}

                        {!scanResult.isAadhaar && (
                            <p className="text-red-700 text-sm mt-2">
                                {language === 'hi'
                                    ? 'कृपया वैध आधार कार्ड स्कैन करें।'
                                    : 'Please scan a valid Aadhaar card.'}
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                {status === 'idle' && !cameraActive && (
                    <div className="space-y-3 pt-4">
                        <button
                            onClick={startCamera}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg"
                        >
                            <Camera className="w-6 h-6" />
                            {language === 'hi' ? 'कैमरा से फोटो लें' : 'Take Photo with Camera'}
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-secondary text-secondary-foreground font-semibold"
                        >
                            <Upload className="w-6 h-6" />
                            {language === 'hi' ? 'गैलरी से अपलोड करें' : 'Upload from Gallery'}
                        </button>
                    </div>
                )}

                {/* Reset Button */}
                {(status === 'success' || status === 'error') && (
                    <button
                        onClick={resetScanner}
                        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-secondary text-secondary-foreground font-semibold"
                    >
                        <RotateCcw className="w-5 h-5" />
                        {language === 'hi' ? 'फिर से स्कैन करें' : 'Scan Another Document'}
                    </button>
                )}

                {/* Cancel Camera Button */}
                {cameraActive && (
                    <button
                        onClick={stopCamera}
                        className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-secondary text-secondary-foreground font-medium"
                    >
                        <X className="w-5 h-5" />
                        {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                )}
            </main>
        </div>
    );
};
