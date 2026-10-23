import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/-kkN11hJF/';

interface Prediction {
  className: string;
  probability: number;
}

export default function ImageClassifier() {
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    async function loadModel() {
      try {
        const modelURL = MODEL_URL + 'model.json';
        const metadataURL = MODEL_URL + 'metadata.json';
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
      } catch (error) {
        console.error('Failed to load the model', error);
      } finally {
        setIsModelLoading(false);
      }
    }
    loadModel();
  }, []);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setPredictions([]); // Clear previous predictions
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setPredictions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const classifyImage = async () => {
    if (model && imageRef.current) {
      setIsPredicting(true);
      try {
        const result = await model.predict(imageRef.current);
        const sortedPredictions = result.sort((a, b) => b.probability - a.probability);
        setPredictions(sortedPredictions);
      } catch (error) {
        console.error('Classification error:', error);
      } finally {
        setIsPredicting(false);
      }
    }
  };

  // We automatically classify when the image has loaded in the DOM
  const handleImageLoad = () => {
    classifyImage();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-3">Vision Classifier</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Upload an image to identify objects using the trained Teachable Machine model.
        </p>
      </div>

      {isModelLoading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[24px] shadow-sm border border-gray-100">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 animate-pulse">Initializing neural engine...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="flex flex-col gap-4">
            <div
              className={`relative flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-[400px] bg-white rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-2 border-dashed ${imageSrc ? 'border-transparent' : 'border-gray-200 hover:border-blue-400'} transition-colors overflow-hidden group cursor-pointer`}
              onClick={() => !imageSrc && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {imageSrc ? (
                <>
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Uploaded"
                    className="w-full h-full object-cover rounded-[20px]"
                    onLoad={handleImageLoad}
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageSrc(null);
                        setPredictions([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="bg-white text-gray-900 px-6 py-2 rounded-full font-medium shadow-lg hover:scale-105 transition-transform"
                    >
                      Clear Image
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center p-8 text-center pointer-events-none">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud strokeWidth={1.5} size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Upload an Image</h3>
                  <p className="text-sm text-gray-500 mb-4">Drag and drop or click to browse</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">JPG, PNG up to 10MB</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 md:p-8 min-h-[400px] flex flex-col items-center justify-center border border-gray-50">
              {!imageSrc ? (
                <div className="flex flex-col items-center text-gray-400">
                  <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-50" />
                  <p>Awaiting image input...</p>
                </div>
              ) : isPredicting ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-500">Analyzing visual features...</p>
                </div>
              ) : predictions.length > 0 ? (
                <div className="w-full flex flex-col h-full">
                  <h3 className="text-xs uppercase tracking-[0.1em] text-gray-400 font-semibold mb-6">Analysis Results</h3>
                  
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    {/* Top Result */}
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-2xl font-medium text-gray-900">
                          {predictions[0].className}
                        </span>
                        <span className="text-5xl font-light text-blue-600">
                          {(predictions[0].probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 flex rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${predictions[0].probability * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="bg-blue-500 h-full rounded-full"
                        />
                      </div>
                    </div>

                    {/* Other Results */}
                    <div className="space-y-4">
                      {predictions.slice(1, 3).map((pred, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="w-1/3 text-sm text-gray-600 truncate">{pred.className}</span>
                          <div className="flex-1 bg-gray-100 h-1.5 flex rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pred.probability * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.1 * (i + 1), ease: "easeOut" }}
                              className="bg-gray-400 h-full rounded-full"
                            />
                          </div>
                          <span className="w-12 text-right text-sm font-mono text-gray-500">
                            {(pred.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
