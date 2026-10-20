"use client"
import Button from "@/components/Button";
import Input from "@/components/Input";
import useLocalStorage from "@/hooks/useLocalStorage";
import { UserWithToken } from "@/interfaces/auth.interface";
import { useAppDispatch } from "@/redux/hook";
import { getLoading, setLoading } from "@/redux/loadingSlice";
import { getUser, setUser } from "@/redux/userSlice";
import apiClient from "@/utils/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";

export default function Home() {

  const loading = useSelector(getLoading)
  const [error, setError] = useState('')
  const [valueStorage, setValue] = useLocalStorage("user", "")
  const dispatch = useAppDispatch();
  const router: AppRouterInstance = useRouter()
  const user: UserWithToken = useSelector(getUser)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: '', password: '' },
  })

  const onSubmit = (formValue: LoginForm) => {
    dispatch(setLoading(true))
    apiClient.post('/auth/login', formValue)
      .then(async (r) => {
        if (r.data === 'NOT_FOUND_USER' || r.data === 'PASSWORD_INCORRECT') {
          setError(r.data)
          dispatch(setLoading(false))
          return
        }
        // Decode JWT to extract role.permissions required by usePermission
        const token = r.data.token;
        let decodedToken: any = null;
        try {
          decodedToken = jwtDecode(token);
        } catch (decodeError) {
          console.error('Error decoding token:', decodeError);
        }

        const userData: UserWithToken = {
          nickname: r.data.nickname || r.data.name || '',
          token: token,
          id: decodedToken?.id || r.data.id || '',
          email: decodedToken?.email || r.data.email || '',
          role: decodedToken?.role || r.data.role || undefined,
        };

        setValue(userData);
        dispatch(setUser(userData));
        await router.push('/home');
        dispatch(setLoading(false));
        return;
      })
      .catch(e => { console.log(e); dispatch(setLoading(false)); })
  }


  return (
    <main className="mt-[10%] flex h-screen flex-col items-center">
      <div className="flex min-w-[400px] flex-col text-center">
        <h2 className="my-[15px] text-[32px]">GOLOZUR</h2>
        <div>
          <Input label={'Usuario'} {...register('nickname')} type='text' />
          {errors.nickname && (
            <p className="text-left text-red-500">{errors.nickname.message}</p>
          )}
          <Input label={'Contraseña'} {...register('password')} type='password' />
          {errors.password && (
            <p>{errors.password.message}</p>
          )}
          <div className="flex w-full items-center justify-end">
            <div className="flex items-center" >
              {
                error !== '' && <div className="mr-[15px] text-red-500">{error}</div>
              }
              <Button text={'INGRESAR'} onClick={handleSubmit(onSubmit)} type='submit' />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const loginSchema = z.object({
  nickname: z.string().min(1, 'Required'),
  password: z.string().min(1, 'Required'),
})

type LoginForm = z.infer<typeof loginSchema>
