import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PiUserCircle } from "react-icons/pi";

const CheckPasswordPage = () => {
  const [data,setData] = useState({
    password : ""
  })
  
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(()=>{
    if(!location?.state?.name){
      navigate('/email')
    }
  },[location, navigate])

  const handleOnChange = (e)=>{
    const { name, value} = e.target

    setData((preve)=>{
      return{
          ...preve,
          [name] : value
      }
    })
  }

  const handleSubmit = async(e)=>{
    e.preventDefault()
    e.stopPropagation()

    const URL = `${process.env.REACT_APP_BACKEND_URL}/api/password`

    try {
      const response = await axios.post(URL,{
        password : data.password,
        userId : location?.state?._id
      },{
        withCredentials: true
      })
     
      toast.success(response.data.message)
      if(response.data.success || response.data.succecc){
        localStorage.setItem('token', response.data.token);
        setData({
          password : ""
        })

        navigate('/')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message)
    }

  }

  return (
    <div className='flex justify-center items-center h-[100dvh] w-full px-4'>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className='glass-panel w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden p-8 mx-auto relative'
      >
        <div className='w-fit mx-auto mb-6 flex justify-center items-center flex-col text-white'>
          <PiUserCircle
            size={85}
          />
          <h2 className='font-semibold text-2xl mt-3 text-transparent bg-clip-text bg-gradient-to-r from-[#00c6ff] to-[#0072ff]'>{location?.state?.name}</h2>
        </div>
        
        <form className='grid gap-5' onSubmit={handleSubmit}>
            <div className='flex flex-col gap-2'>
              <label htmlFor='password' className='text-gray-300 text-sm font-semibold'>Password</label>
              <input
                type='password'
                id='password'
                name='password'
                placeholder='Enter your password' 
                className='bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all'
                value={data.password}
                onChange={handleOnChange}
                required
              />
            </div>
  
            <button
             className='bg-bg-bubble-me hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(0,198,255,0.4)] text-lg px-4 py-3 rounded-xl mt-4 font-bold text-white'
            >
              Login
            </button>
  
        </form>
  
        <p className='mt-6 text-center text-gray-400'><Link to={"/forgot-password"} className='text-accent hover:text-white transition-colors font-semibold'>Forgot password?</Link></p>
      </motion.div>
    </div>
  )
}

export default CheckPasswordPage