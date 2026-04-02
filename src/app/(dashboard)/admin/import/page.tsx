
"use client"

import { useState } from "react"
import { FileUp, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
    }
  }

  const startUpload = () => {
    setUploading(true)
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setUploading(false)
      }
    }, 200)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Importación Masiva</h2>
        <p className="text-muted-foreground">Sube tus archivos de Excel para registrar programas, cursos y docentes rápidamente.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Dropzone de Archivos</CardTitle>
            <CardDescription>Solo se permiten archivos .xlsx o .xls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer
                  flex flex-col items-center justify-center text-center gap-4
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}
                `}
              >
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileUp className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">Arrastra y suelta tu archivo Excel aquí</p>
                  <p className="text-sm text-muted-foreground">o haz clic para seleccionar desde tu ordenador</p>
                </div>
                <Button variant="outline" onClick={() => document.getElementById('fileInput')?.click()}>
                  Seleccionar Archivo
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div className="border rounded-xl p-6 bg-muted/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setFile(null); setProgress(0); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Procesando registros...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : progress === 100 ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>¡Archivo procesado con éxito! 245 registros importados.</span>
                  </div>
                ) : (
                  <Button onClick={startUpload} className="w-full">
                    Iniciar Importación
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">1</div>
              <p>Descarga la <span className="text-primary cursor-pointer font-medium hover:underline">plantilla oficial</span> para asegurar el formato correcto.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">2</div>
              <p>Verifica que no existan filas vacías entre registros.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">3</div>
              <p>Los campos de ID de Programa deben coincidir con los existentes.</p>
            </div>
            <div className="mt-6 p-4 bg-amber-50 rounded-lg text-amber-700 border border-amber-100 flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs">Nota: Los registros con DNI duplicado serán omitidos automáticamente.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
