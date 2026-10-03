import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert.tsx'

// A red box with an error message, usually the backend's own text
export default function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
      <CircleAlert />
      <AlertDescription className="text-destructive">{message}</AlertDescription>
    </Alert>
  )
}
