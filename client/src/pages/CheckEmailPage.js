import React, { useState } from 'react'
import { IoClose } from "react-icons/io5";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import uploadFile from '../helper/uploadFile';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PiUserCircle } from "react-icons/pi";

const CheckEmailPage = () => {
  const [data,setData] = useState({
    
    email : ""
    
  })
  
  const navigate = useNavigate()

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

    const URL = `${process.env.REACT_APP_BACKEND_URL}/api/email`

    try {
      const response = await axios.post(URL,data)
     

      toast.success(response.data.message)
      if(response.data.success){
        setData({
          email : ""
        })

        navigate('/password',{
          state : response?.data?.data
        })
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
    <div className='w-fit mx-auto mb-6 text-white'>
      <PiUserCircle
        size={85}
      />
    </div>
      <h3 className='text-3xl font-bold text-center text-white mb-8'>Welcome Back!</h3>

      <form className='grid gap-4 mt-3' onSubmit={handleSubmit}>
          

          <div className='flex flex-col gap-2'>
            <label htmlFor='email' className='text-gray-300 text-sm font-semibold'>Email</label>
            <input
              type='email'
              id='email'
              name='email'
              placeholder='Enter your email' 
              className='bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all'
              value={data.email}
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

      <p className='mt-6 text-center text-gray-400'>New User? <Link to={"/register"} className='text-accent hover:text-white transition-colors font-semibold'>Register</Link></p>
    </motion.div>
</div>
  )
}

export default CheckEmailPage