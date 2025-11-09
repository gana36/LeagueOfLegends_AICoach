import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

const YearRecapCarousel = ({ cachedNarrativeData }) => {
  const [narrativeData, setNarrativeData] = useState(cachedNarrativeData || null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const carouselRef = useRef(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [uploadingCollage, setUploadingCollage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const cardRefs = useRef([]);

  // Use cached data if provided
  useEffect(() => {
    if (cachedNarrativeData) {
      setNarrativeData(cachedNarrativeData);
    }
  }, [cachedNarrativeData]);

  const nextCard = () => {
    if (narrativeData && currentCardIndex < narrativeData.cards.length - 1) {
      setDirection('next');
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setDirection('prev');
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleShare = async () => {
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/#/year-recap`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDownloadCurrentCard = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;

      if (carouselRef.current) {
        const canvas = await html2canvas(carouselRef.current, {
          backgroundColor: '#0a1428',
          useCORS: true,
          logging: false,
          scale: 2,
          allowTaint: true,
          foreignObjectRendering: false,
          imageTimeout: 0,
          removeContainer: true,
          ignoreElements: (element) => {
            return element.hasAttribute('data-html2canvas-ignore');
          }
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `year-recap-card-${currentCardIndex + 1}-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } catch (err) {
      console.error('Failed to download image:', err);
      alert('Failed to download current card. Please try again.');
    }
  };

  const handleGenerateCollage = async () => {
    try {
      setUploadingCollage(true);
      setShareError(null);
      setShareUrl(null); // Clear previous URL
      setUploadProgress(0);
      setProgressMessage('Preparing to capture cards...');

      // Hide modal while capturing
      setShowShareModal(false);

      const html2canvas = (await import('html2canvas')).default;

      if (!narrativeData || !narrativeData.cards) {
        throw new Error('No cards available');
      }

      // Store current card index
      const originalIndex = currentCardIndex;

      // Array to store canvases for each card
      const cardCanvases = [];

      // Wait a moment for modal to close
      await new Promise(resolve => setTimeout(resolve, 300));

      // Enable capture mode (simplifies rendering)
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture each card
      for (let i = 0; i < narrativeData.cards.length; i++) {
        const progress = Math.floor((i / narrativeData.cards.length) * 50);
        setUploadProgress(progress);
        setProgressMessage(`Capturing card ${i + 1} of ${narrativeData.cards.length}...`);

        // Navigate to the card
        setCurrentCardIndex(i);

        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture the card
        const canvas = await html2canvas(carouselRef.current, {
          backgroundColor: '#0a1428',
          useCORS: true,
          logging: false,
          scale: 2,
          allowTaint: true,
          foreignObjectRendering: false,
          imageTimeout: 0,
          removeContainer: true,
          ignoreElements: (element) => {
            return element.hasAttribute('data-html2canvas-ignore');
          }
        });

        cardCanvases.push(canvas);
      }

      // Disable capture mode
      setIsCapturing(false);

      // Restore original card
      setCurrentCardIndex(originalIndex);

      setProgressMessage('Creating collage...');
      setUploadProgress(55);

      // Create vertical collage
      const cardWidth = cardCanvases[0].width;
      const cardHeight = cardCanvases[0].height;
      const collageCanvas = document.createElement('canvas');
      collageCanvas.width = cardWidth;
      collageCanvas.height = cardHeight * cardCanvases.length;
      const ctx = collageCanvas.getContext('2d');

      // Draw all cards vertically
      cardCanvases.forEach((canvas, index) => {
        ctx.drawImage(canvas, 0, cardHeight * index);
      });

      setUploadProgress(60);
      setProgressMessage('Preparing image...');

      // Convert to base64
      const collageDataUrl = collageCanvas.toDataURL('image/png');

      setUploadProgress(70);
      setProgressMessage('Uploading to cloud...');

      // Use PUUID for S3 path (no special characters), player name for download filename
      const puuid = narrativeData.puuid || 'player';
      const playerName = (narrativeData.player_name || narrativeData.game_name || 'player').replace(/[#\/\\]/g, '-');

      // Upload to S3
      const response = await fetch(`${API_URL}/api/share/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puuid: puuid,
          image_data: collageDataUrl,
          recap_type: 'collage'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to S3');
      }

      const data = await response.json();
      setUploadProgress(100);
      setProgressMessage('Upload complete!');
      setShareUrl(data.url);

      // Also trigger download with safe filename
      const link = document.createElement('a');
      link.download = `year-recap-collage-${playerName}-${Date.now()}.png`;
      link.href = collageDataUrl;
      link.click();

      // Reopen modal to show the result
      setTimeout(() => {
        setShowShareModal(true);
      }, 500);

      // Clear progress after a short delay to show 100%
      setTimeout(() => {
        setUploadProgress(0);
        setProgressMessage('');
      }, 2000);

    } catch (err) {
      console.error('Failed to generate collage:', err);
      setShareError('Failed to generate collage. Please try again.');
      setShowShareModal(true); // Reopen modal to show error
    } finally {
      setIsCapturing(false); // Always disable capture mode
      setUploadingCollage(false);
    }
  };

  const handleGenerateVideo = async () => {
    try {
      setUploadingVideo(true);
      setShareError(null);
      setShareUrl(null); // Clear previous URL
      setUploadProgress(0);
      setProgressMessage('Preparing to record video...');

      // Hide modal while capturing
      setShowShareModal(false);

      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        throw new Error('Video recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      }

      // Wait a moment for modal to close
      await new Promise(resolve => setTimeout(resolve, 300));

      // Enable capture mode (simplifies rendering)
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      setProgressMessage('Starting video recording...');
      const originalIndex = currentCardIndex;

      // Create a hidden container for recording
      const recordingContainer = document.createElement('div');
      recordingContainer.style.position = 'fixed';
      recordingContainer.style.top = '0';
      recordingContainer.style.left = '0';
      recordingContainer.style.width = '1920px';
      recordingContainer.style.height = '1080px';
      recordingContainer.style.zIndex = '-9999';
      document.body.appendChild(recordingContainer);

      // Use canvas stream for recording
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30); // 30 FPS

      // Try to use MP4 first for better compatibility, fall back to WebM
      let mimeType = 'video/webm;codecs=vp9'; // Default fallback
      let fileExtension = 'webm';

      // Check MP4 support (best for social media)
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
        mimeType = 'video/mp4;codecs=h264';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExtension = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
        fileExtension = 'webm';
      }

      console.log(`Recording with MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.start();
      setUploadProgress(10);

      const html2canvas = (await import('html2canvas')).default;

      // Record each card for 2 seconds
      const cardDuration = 2000; // 2 seconds per card
      const totalCards = narrativeData.cards.length;

      for (let i = 0; i < totalCards; i++) {
        const progress = 10 + Math.floor((i / totalCards) * 60);
        setUploadProgress(progress);
        setProgressMessage(`Recording card ${i + 1} of ${totalCards}...`);
        setCurrentCardIndex(i);
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for transition

        const startTime = Date.now();
        while (Date.now() - startTime < cardDuration) {
          const cardCanvas = await html2canvas(carouselRef.current, {
            backgroundColor: '#0a1428',
            useCORS: true,
            logging: false,
            scale: 2,
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 0,
            removeContainer: true,
            ignoreElements: (element) => {
              return element.hasAttribute('data-html2canvas-ignore');
            }
          });

          ctx.drawImage(cardCanvas, 0, 0, 1920, 1080);
          await new Promise(resolve => setTimeout(resolve, 33)); // ~30 FPS
        }
      }

      setUploadProgress(75);
      setProgressMessage('Finalizing recording...');

      // Stop recording
      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve;
        mediaRecorder.stop();
      });

      // Disable capture mode
      setIsCapturing(false);

      // Restore original card
      setCurrentCardIndex(originalIndex);
      document.body.removeChild(recordingContainer);

      setUploadProgress(80);
      setProgressMessage('Processing video...');

      // Create blob from chunks with the correct MIME type
      const videoBlob = new Blob(chunks, { type: mimeType });

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(videoBlob);
      });

      const videoDataUrl = await base64Promise;
      setUploadProgress(90);
      setProgressMessage('Uploading to cloud...');

      // Use PUUID for S3 path (no special characters), player name for download filename
      const puuid = narrativeData.puuid || 'player';
      const playerName = (narrativeData.player_name || narrativeData.game_name || 'player').replace(/[#\/\\]/g, '-');

      // Upload to S3
      const response = await fetch(`${API_URL}/api/share/upload-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puuid: puuid,
          video_data: videoDataUrl,
          file_extension: fileExtension
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload video to S3');
      }

      const data = await response.json();
      setUploadProgress(100);
      setProgressMessage('Upload complete!');
      setShareUrl(data.url);

      // Also trigger download with safe filename
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.download = `year-recap-video-${playerName}-${Date.now()}.${fileExtension}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // Reopen modal to show the result
      setTimeout(() => {
        setShowShareModal(true);
      }, 500);

      // Clear progress after a short delay to show 100%
      setTimeout(() => {
        setUploadProgress(0);
        setProgressMessage('');
      }, 2000);

    } catch (err) {
      console.error('Failed to generate video:', err);
      setShareError(err.message || 'Failed to generate video. Please try again.');
      setShowShareModal(true); // Reopen modal to show error
    } finally {
      setIsCapturing(false); // Always disable capture mode
      setUploadingVideo(false);
    }
  };

  const goToCard = (index) => {
    setDirection(index > currentCardIndex ? 'next' : 'prev');
    setCurrentCardIndex(index);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        nextCard();
      } else {
        prevCard();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex, narrativeData]);

  if (!narrativeData || !narrativeData.cards) {
    return null;
  }

  const currentCard = narrativeData.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / narrativeData.cards.length) * 100;

  return (
    <>
      {/* Capture Mode Styles - Simplifies rendering for better image quality */}
      {isCapturing && (
        <style>{`
          .capturing-mode * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          .capturing-mode .backdrop-blur-lg,
          .capturing-mode .backdrop-blur-sm,
          .capturing-mode .backdrop-blur-md {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background-color: rgba(10, 20, 40, 0.9) !important;
          }
          .capturing-mode .blur-\\[150px\\] {
            filter: blur(100px) !important;
          }
        `}</style>
      )}
      <div
        className={`relative min-h-screen overflow-hidden ${isCapturing ? 'capturing-mode' : ''}`}
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Background */}
        <div className={`absolute inset-0 transition-all duration-1000 ${getThemeBackground(currentCard.theme)}`}>
        <HextechPattern />
        {/* Glowing orbs for atmosphere */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C89B3C] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0397AB] rounded-full blur-[150px] opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            {narrativeData.cards.map((card, index) => (
              <div
                key={index}
                className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:bg-white/30 transition-all group"
                onClick={() => goToCard(index)}
                title={`Card ${index + 1}: ${card.title || card.type}`}
              >
                <div
                  className={`h-full bg-white transition-all duration-500 group-hover:bg-yellow-300 ${
                    index <= currentCardIndex ? 'rounded-full' : ''
                  }`}
                  style={{
                    width: index < currentCardIndex ? '100%' :
                           index === currentCardIndex ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Card Counter & Title */}
          <div className="text-white/80 text-sm mt-3 text-center font-medium">
            <span className="text-white">{currentCardIndex + 1}</span> / {narrativeData.cards.length}
            {currentCard.title && (
              <span className="ml-2 text-white/60">• {currentCard.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20 md:px-8">
        <div
          key={currentCardIndex}
          className={`
            w-full max-w-3xl
            animate-fade-in
            ${direction === 'next' ? 'animate-slide-left' : 'animate-slide-right'}
          `}
        >
          <CardRenderer card={currentCard} onShare={handleShare} />
        </div>
      </div>

      {/* Navigation Arrows - Side positioned */}
      <div className="absolute inset-y-0 left-0 right-0 z-50 flex items-center justify-between px-4 pointer-events-none">
        <button
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className={`
            pointer-events-auto w-12 h-12 rounded-full font-semibold transition-all backdrop-blur-sm
            ${currentCardIndex === 0
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
            }
          `}
          aria-label="Previous card"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === narrativeData.cards.length - 1}
          className={`
            pointer-events-auto w-12 h-12 rounded-full font-semibold transition-all backdrop-blur-sm
            ${currentCardIndex === narrativeData.cards.length - 1
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
            }
          `}
          aria-label="Next card"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Swipe Hint - Only show on first card */}
      {currentCardIndex === 0 && (
        <div className="absolute bottom-8 left-0 right-0 text-center text-white/50 text-sm animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Swipe or use arrow keys</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      )}

      {/* Floating Progress Toast - Positioned outside capture area */}
      {(uploadingCollage || uploadingVideo) && (
        <div
          className="fixed bottom-8 right-8 z-[9999] bg-gradient-to-br from-[#0a1428] to-[#1b263b] border-2 border-[#C89B3C] rounded-lg p-6 shadow-[0_0_30px_rgba(200,155,60,0.5)] max-w-sm animate-fade-in"
          data-html2canvas-ignore="true"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-full border-4 border-[#C89B3C]/30 border-t-[#C89B3C] animate-spin"></div>
            <div className="flex-1">
              <h3 className="text-white font-black text-lg uppercase tracking-wide">
                {uploadingCollage ? 'Creating Collage' : 'Recording Video'}
              </h3>
              <p className="text-[#C89B3C] text-sm font-semibold mt-1">
                {progressMessage}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C89B3C] to-[#0397AB] transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-right mt-2">
              <span className="text-white font-bold text-sm">{uploadProgress}%</span>
            </div>
          </div>

          <p className="text-white/60 text-xs mt-3 text-center font-medium">
            Please don't close this tab
          </p>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-8 max-w-2xl w-full border-2 border-[#C89B3C] shadow-[0_0_30px_rgba(200,155,60,0.3)]" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-3xl font-black text-[#C89B3C] mb-6 uppercase tracking-wide" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>
              Share Your Recap
            </h2>

            {/* Share URL Display */}
            {shareUrl && (
              <div className="mb-6 p-4 bg-[#C89B3C]/10 border border-[#C89B3C]/30 rounded-lg">
                <p className="text-[#C89B3C] text-sm font-bold mb-2 uppercase tracking-wide">Shareable Link Created!</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-black/30 text-white px-3 py-2 rounded text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="bg-[#C89B3C] hover:bg-[#d4a64a] text-black px-4 py-2 rounded font-bold transition-colors"
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {shareError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm font-semibold">{shareError}</p>
              </div>
            )}

            {/* Progress Bar */}
            {(uploadingCollage || uploadingVideo) && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/80 font-semibold">
                    {uploadingCollage ? 'Generating Collage...' : 'Recording Video...'}
                  </span>
                  <span className="text-[#C89B3C] font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C89B3C] to-[#0397AB] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Generate Collage Button */}
              <button
                onClick={handleGenerateCollage}
                disabled={uploadingCollage || uploadingVideo}
                className={`w-full font-black py-4 px-6 rounded-lg transition-all transform shadow-lg border-2 flex items-center justify-center gap-3 uppercase tracking-wider ${
                  uploadingCollage || uploadingVideo
                    ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#C89B3C] to-[#9d7c30] hover:from-[#d4a64a] hover:to-[#C89B3C] text-[#0a1428] border-[#C89B3C] hover:scale-105'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="text-sm">All Cards Collage</div>
                  <div className="text-xs opacity-70">Perfect for Instagram/Discord</div>
                </div>
              </button>

              {/* Generate Video Button */}
              <button
                onClick={handleGenerateVideo}
                disabled={uploadingCollage || uploadingVideo}
                className={`w-full font-black py-4 px-6 rounded-lg transition-all transform shadow-lg border-2 flex items-center justify-center gap-3 uppercase tracking-wider ${
                  uploadingCollage || uploadingVideo
                    ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#0397AB] to-[#026e7a] hover:from-[#04a5b8] hover:to-[#0397AB] text-white border-[#0397AB] hover:scale-105'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="text-sm">Animated Video</div>
                  <div className="text-xs opacity-70">Shows animations & transitions</div>
                </div>
              </button>

              <p className="text-white/60 text-sm text-center mt-4 font-semibold">
                Perfect for sharing on Discord, Twitter, or anywhere! 🎮
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

// League of Legends Theme backgrounds
const getThemeBackground = (theme) => {
  const themes = {
    // Dark blue with gold accents - League signature colors
    'gradient-purple': 'bg-gradient-to-br from-[#0a1428] via-[#0d1b2a] to-[#1b263b]',
    'gradient-red': 'bg-gradient-to-br from-[#1a0e0e] via-[#2d1515] to-[#1b263b]',
    'gradient-blue': 'bg-gradient-to-br from-[#0a1428] via-[#1e3a5f] to-[#0d1b2a]',
    'gradient-gold': 'bg-gradient-to-br from-[#2a1810] via-[#3d2817] to-[#1b263b]',
    'gradient-cyan': 'bg-gradient-to-br from-[#0a2a2a] via-[#0d1b2a] to-[#1b263b]',
    'gradient-green': 'bg-gradient-to-br from-[#0f1e0f] via-[#1b2a1b] to-[#0d1b2a]',
    'gradient-orange': 'bg-gradient-to-br from-[#2a1510] via-[#1b263b] to-[#0d1b2a]',
    'gradient-rainbow': 'bg-gradient-to-br from-[#1a0e2e] via-[#0d1b2a] to-[#2a1810]'
  };
  return themes[theme] || themes['gradient-purple'];
};

// Hextech pattern overlay component
const HextechPattern = () => (
  <div className="absolute inset-0 opacity-5 pointer-events-none">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hextech" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" fill="none" stroke="currentColor" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hextech)" />
    </svg>
  </div>
);

// Card Renderer - renders different card types
const CardRenderer = ({ card, onShare }) => {
  switch (card.type) {
    case 'hero':
      return <HeroCard card={card} />;
    case 'stats':
      return <StatsCard card={card} />;
    case 'champion_showcase':
      return <ChampionShowcaseCard card={card} />;
    case 'achievements':
      return <AchievementsCard card={card} />;
    case 'time_stats':
      return <TimeStatsCard card={card} />;
    case 'support_stats':
      return <SupportStatsCard card={card} />;
    case 'highlight':
      return <HighlightCard card={card} />;
    case 'narrative':
      return <NarrativeCard card={card} />;
    case 'finale':
      return <FinaleCard card={card} onShare={onShare} />;
    default:
      return <div className="text-white">Unknown card type</div>;
  }
};

// Hero Card (Opening) - League themed
const HeroCard = ({ card }) => (
  <div className="text-center text-white space-y-6 animate-fade-in-up relative">
    {/* League-style corner accents */}
    <div className="absolute top-0 left-0 w-24 h-24 border-l-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute top-0 right-0 w-24 h-24 border-r-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 border-l-4 border-b-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-24 h-24 border-r-4 border-b-4 border-[#C89B3C] opacity-50"></div>

    <div className="space-y-4 relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-2">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Victory</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-shadow-lg uppercase" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>
        {card.title}
      </h1>
      <p className="text-xl sm:text-2xl md:text-3xl text-[#C89B3C] font-bold tracking-widest uppercase">
        {card.subtitle}
      </p>
    </div>

    <div className="mt-8 relative z-10">
      <div className="relative inline-block group">
        {/* Hexagonal border effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>

        <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-8 md:p-10 border-2 border-[#C89B3C] shadow-2xl">
          <div className="text-5xl md:text-6xl mb-3 drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{card.primary_stat.icon}</div>
          <div className="text-5xl md:text-6xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.primary_stat.value}</div>
          <div className="text-lg md:text-xl text-white/90 font-bold tracking-[0.1em] uppercase">
            {card.primary_stat.label}
          </div>

          {/* Decorative lines */}
          <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        </div>
      </div>
    </div>

    {card.secondary_stats && (
      <div className="flex justify-center gap-8 md:gap-12 mt-8 relative z-10">
        {card.secondary_stats.map((stat, idx) => (
          <div key={idx} className="text-center group">
            <div className="text-3xl md:text-4xl font-black mb-1 text-[#C89B3C] group-hover:scale-110 transition-transform" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{stat.value}</div>
            <div className="text-sm md:text-base text-white/80 font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Stats Card (Combat Stats) - League themed
const StatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Combat Stats</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
      {card.stats.map((stat, idx) => (
        <div
          key={idx}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C] to-[#0397AB] opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 md:p-8 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-4xl md:text-5xl mb-4 drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{stat.icon}</div>
            <div className="text-3xl md:text-4xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{stat.value}</div>
            <div className="text-base md:text-lg text-white/90 font-bold uppercase tracking-wide">{stat.label}</div>

            {/* Decorative line */}
            <div className="absolute bottom-2 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/30 to-transparent"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Champion Showcase Card - League themed
const ChampionShowcaseCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Champion Mastery</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-6xl font-black mb-4 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.main_champion.name}</div>
        <div className="text-3xl text-[#C89B3C] mb-2 font-bold">{card.main_champion.games} games</div>
        <div className="text-xl text-white/70 font-semibold">{card.main_champion.percentage}% of your matches</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="mt-8 space-y-4 relative z-10">
      <p className="text-[#C89B3C]/80 font-bold uppercase tracking-wider text-sm">Your Top Champions:</p>
      <div className="flex justify-center gap-6">
        {card.top_champions.slice(0, 3).map((champ, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-4 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
              <div className="text-xl font-black uppercase">{champ.name}</div>
              <div className="text-sm text-[#C89B3C]/80 font-semibold">{champ.games} games</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <p className="text-white/60 mt-8 font-semibold uppercase text-sm tracking-wider relative z-10">
      Played {card.total_champions} different champions • Favorite role: {card.favorite_role}
    </p>
  </div>
);

// Achievements Card (Milestones) - League themed
const AchievementsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Achievements</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
      <p className="text-lg text-[#C89B3C]/80 font-semibold">{card.subtitle}</p>
    </div>

    <div className="space-y-4 mt-12 relative z-10">
      {card.milestones.map((milestone, idx) => {
        const rarityColors = {
          'legendary': { border: 'border-[#FFD700]', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.5)]', bg: 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20' },
          'rare': { border: 'border-[#9D4EDD]', glow: 'shadow-[0_0_20px_rgba(157,78,221,0.5)]', bg: 'bg-gradient-to-r from-[#9D4EDD]/20 to-[#7209B7]/20' },
          'uncommon': { border: 'border-[#0397AB]', glow: 'shadow-[0_0_15px_rgba(3,151,171,0.4)]', bg: 'bg-gradient-to-r from-[#0397AB]/20 to-[#06283D]/20' },
          'common': { border: 'border-[#C89B3C]/50', glow: '', bg: 'bg-[#C89B3C]/10' }
        };
        const colors = rarityColors[milestone.rarity] || rarityColors['common'];

        return (
          <div
            key={idx}
            className="relative group"
          >
            <div className={`absolute -inset-1 ${colors.glow} ${colors.bg} blur opacity-50 group-hover:opacity-75 transition-opacity`}></div>
            <div className={`relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-5 md:p-6 border-2 ${colors.border} transition-all hover:scale-[1.02]`}>
              <div className="flex items-center gap-4">
                <div className="text-4xl md:text-5xl drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{milestone.icon}</div>
                <div className="text-left flex-1">
                  <div className="text-xl md:text-2xl font-black mb-1 uppercase tracking-wide" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.3)'}}>{milestone.title}</div>
                  <div className="text-base md:text-lg text-white/80 font-medium">{milestone.description}</div>
                  <div className={`inline-block mt-2 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-sm ${colors.bg} ${colors.border} border`}>
                    {milestone.rarity}
                  </div>
                </div>
              </div>

              {/* Decorative corner accents */}
              <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${colors.border}`}></div>
              <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${colors.border}`}></div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Time Stats Card - League themed
const TimeStatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Time on the Rift</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-7xl font-black mb-4 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.main_stat.value}</div>
        <div className="text-3xl text-white/90 mb-2 font-bold uppercase tracking-wide">{card.main_stat.label}</div>
        <div className="text-lg text-[#C89B3C]/80 font-semibold">{card.main_stat.sublabel}</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mt-12 relative z-10">
      {card.details.map((detail, idx) => (
        <div key={idx} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-2xl font-black mb-1 text-[#C89B3C]">{detail.value}</div>
            <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">{detail.label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Support Stats Card (Vision) - League themed
const SupportStatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Vision Control</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(200,155,60,0.5)]">{card.main_stat.icon}</div>
        <div className="text-6xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.main_stat.value}</div>
        <div className="text-2xl text-white/90 font-bold uppercase tracking-wide">{card.main_stat.label}</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="space-y-6 mt-12 relative z-10">
      {card.secondary_stats.map((stat, idx) => (
        <div key={idx} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-3xl font-black mb-1 text-[#C89B3C]">{stat.value}</div>
            <div className="text-lg text-white/90 mb-1 font-bold uppercase tracking-wide">{stat.label}</div>
            <div className="text-sm text-[#C89B3C]/70 font-semibold">{stat.description}</div>

            {/* Decorative corner accent */}
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#C89B3C]/50"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Highlight Card (Best Month) - League themed
const HighlightCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Highlight</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
      <p className="text-3xl text-[#C89B3C] font-bold uppercase tracking-wider">{card.month}</p>
    </div>

    <div className="relative group mt-12 z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <p className="text-2xl text-white/90 mb-8 font-semibold">{card.description}</p>
        {card.stats && (
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <div className="text-4xl font-black text-[#C89B3C] mb-2" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{card.stats.games}</div>
              <div className="text-white/80 font-bold uppercase tracking-wide">Games Played</div>
              {/* Vertical divider */}
              <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#C89B3C] mb-2" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{card.stats.wins}</div>
              <div className="text-white/80 font-bold uppercase tracking-wide">Wins</div>
            </div>
          </div>
        )}

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C89B3C]/50"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C89B3C]/50"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C89B3C]/50"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C89B3C]/50"></div>
      </div>
    </div>
  </div>
);

// Narrative Card (AI Summary) - League themed
const NarrativeCard = ({ card }) => (
  <div className="text-center text-white space-y-8 max-w-3xl mx-auto relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Your Journey</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        {/* Quote marks decoration */}
        <div className="absolute top-6 left-6 text-[#C89B3C]/30 text-6xl font-serif leading-none">"</div>

        <p className="text-2xl leading-relaxed text-white/90 font-medium px-8 py-4">
          {card.narrative}
        </p>

        <div className="absolute bottom-6 right-6 text-[#C89B3C]/30 text-6xl font-serif leading-none">"</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>

        {/* Side accents */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>
  </div>
);

// Finale Card (Closing) - League themed
const FinaleCard = ({ card, onShare }) => (
  <div className="text-center text-white space-y-12 relative">
    {/* League-style corner accents */}
    <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-[#C89B3C] opacity-50"></div>

    {/* Central emblem effect */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C89B3C] rounded-full blur-[200px] opacity-10 animate-pulse"></div>

    <div className="space-y-8 relative z-10">
      <div className="inline-block px-8 py-3 bg-[#C89B3C]/20 border-2 border-[#C89B3C] rounded-sm mb-4 animate-pulse">
        <span className="text-[#C89B3C] text-lg font-black tracking-[0.3em] uppercase">2024 Complete</span>
      </div>

      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight uppercase" style={{textShadow: '0 0 30px rgba(200, 155, 60, 0.8)'}}>
        {card.title}
      </h1>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent"></div>
        <p className="text-2xl sm:text-3xl text-[#C89B3C] font-bold tracking-wide">{card.message}</p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent"></div>
      </div>
    </div>

    <div className="mt-16 relative z-10">
      <div className="relative inline-block group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
        <button
          onClick={onShare}
          className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] text-white px-12 py-6 border-2 border-[#C89B3C] text-2xl font-black uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(200,155,60,0.5)]"
          style={{clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}}>
          <span className="drop-shadow-[0_0_10px_rgba(200,155,60,0.8)]">{card.call_to_action}</span>
        </button>
      </div>
    </div>

    <div className="mt-12 text-[#C89B3C]/80 text-xl font-bold tracking-wider uppercase relative z-10">
      See you on the Rift! ⚔️
    </div>

    {/* Decorative hextech corners */}
    <div className="absolute top-8 left-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute top-8 right-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute bottom-8 left-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute bottom-8 right-8 text-[#C89B3C]/30 text-6xl">⬡</div>
  </div>
);

export default YearRecapCarousel;
