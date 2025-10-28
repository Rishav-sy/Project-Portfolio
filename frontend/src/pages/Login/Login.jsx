import { LoginForm } from '@/components/login-form'

function Login() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

export default Login
