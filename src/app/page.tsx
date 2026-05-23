"use client"
import Button from "@/components/Button";
import Input from "@/components/Input";
import Loading from "@/components/Loading";
import MiniLoading from "@/components/MiniLoading";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Auth, UserWithToken } from "@/interfaces/auth.interface";
import { useAppDispatch } from "@/redux/hook";
import { getLoading, setLoading } from "@/redux/loadingSlice";
import { getUser, setUser } from "@/redux/userSlice";
import apiClient from "@/utils/client";
import { useFormik } from "formik";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import * as Yup from 'yup';
import { jwtDecode } from "jwt-decode";

export default function Home() {

  const loading = useSelector(getLoading)
  const [error, setError] = useState('')
  const [valueStorage, setValue] = useLocalStorage("user", "")
  const dispatch = useAppDispatch();
  const router: AppRouterInstance = useRouter()
  const user: UserWithToken = useSelector(getUser)

  const formik = useFormik({
    initialValues: initialValues,
    validationSchema: SignupSchema,
    onSubmit: (formValue: Auth) => {
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
  })


  return (
    <Main>
      <ContainerLogin>
        <Title>GOLOZUR</Title>
        <div>
          <Input label={'Usuario'} name={'nickname'} value={formik.values.nickname} onChange={formik.handleChange} type='text' />
          {formik.errors.nickname && formik.touched.nickname && (
            <p style={{ color: 'red', textAlign: 'start' }}>{formik.errors.nickname}</p>
          )}
          <Input label={'Contraseña'} name={'password'} value={formik.values.password} onChange={formik.handleChange} type='password' />
          {formik.errors.password && formik.touched.password && (
            <p>{formik.errors.password}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'end', width: '100%' }}>
            <div style={{ display: "flex", alignItems: "center" }} >
              {
                error !== '' && <div style={{ color: 'red', marginRight: 15 }}>{error}</div>
              }
              <Button text={'INGRESAR'} onClick={formik.handleSubmit} type='submit' />
            </div>
          </div>
        </div>
      </ContainerLogin>
    </Main>
  );
}

const initialValues: Auth = {
  nickname: '',
  password: ''
};

const SignupSchema = Yup.object().shape({
  password: Yup.string().required('Required'),
  nickname: Yup.string().required('Required'),
});

const Main = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  margin-top: 10%;
`

const ContainerLogin = styled.div`
  display: flex;
  flex-direction: column;
  text-align: center;
  min-width: 400px;
`

const Title = styled.h2`
  margin: 15px 0;
  font-size: 32px;
`

