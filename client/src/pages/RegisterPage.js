import React, { useState } from 'react'
import { IoClose } from "react-icons/io5";
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import uploadFile from '../helper/uploadFile';
import axios from 'axios';
import toast from 'react-hot-toast';


const RegisterPage = () => {
  const [data,setData] = useState({
    name : "",
    email : "",
    password : "",
    profile_pic : ""
  })
  const [uploadPhoto,setUploadPhoto] = useState("")
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

  const handleUploadPhoto = async(e)=>{
    const file = e.target.files[0]

    const uploadPhoto = await uploadFile(file)
    
    setUploadPhoto(file)
    setData((preve)=>{
      return{
        ...preve,
        profile_pic : uploadPhoto?.url
      }
    })

    
  }
  const handleClearUploadPhoto = (e)=>{
    e.stopPropagation()
    e.preventDefault()
    setUploadPhoto(null)
  }

  const handleSubmit = async(e)=>{
    e.preventDefault()
    e.stopPropagation()

    const URL = `${process.env.REACT_APP_BACKEND_URL}/api/register`

    try {
      const response = await axios.post(URL,data)
      console.log("response",response)

      toast.success(response.data.message)
      if(response.data.success){
        setData({
          name : "",
          email : "",
          password : "",
          profile_pic : "",
        })

        navigate('/email')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message)
            
    }

    console.log('data',data)
  }


  return (
    <div className='flex justify-center items-center h-[100dvh] w-full px-4'>
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className='glass-panel w-full max-w-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden p-8 mx-auto relative'
        >
          <h3 className='text-3xl font-bold text-center text-white mb-2'>Welcome to <span className='text-transparent bg-clip-text bg-gradient-to-r from-[#00c6ff] to-[#0072ff]'>QuickTalk!</span></h3>
          <p className='text-center text-gray-400 mb-8'>Create an account to get started</p>

          <form className='grid gap-5' onSubmit={handleSubmit}>
              <div className='flex flex-col gap-2'>
                <label htmlFor='name' className='text-gray-300 text-sm font-semibold'>Name</label>
                <input
                  type='text'
                  id='name'
                  name='name'
                  placeholder='Enter your name' 
                  className='bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all'
                  value={data.name}
                  onChange={handleOnChange}
                  required
                />
              </div>

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

              <div className='flex flex-col gap-2'>
                <label htmlFor='profile_pic' className='text-gray-300 text-sm font-semibold'>Profile Photo
                  <div className='h-14 bg-white/5 border border-white/10 mt-2 flex justify-center items-center rounded-xl hover:border-accent cursor-pointer transition-all'>
                      <p className='text-sm max-w-[300px] text-ellipsis line-clamp-1 text-gray-400'>
                        {
                          uploadPhoto?.name ? uploadPhoto?.name : "Click to upload photo"
                        }
                      </p>
                      {
                        uploadPhoto?.name && (
                          <button className='text-lg ml-2 text-white hover:text-red-500 transition-colors' onClick={handleClearUploadPhoto}>
                            <IoClose/>
                          </button>
                        )
                      }
                  </div>
                </label>
                
                <input
                  type='file'
                  id='profile_pic'
                  name='profile_pic'
                  className='bg-slate-100 px-2 py-1 focus:outline-primary hidden'
                  onChange={handleUploadPhoto}
                />
              </div>


              <button
               className='bg-bg-bubble-me hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(0,198,255,0.4)] text-lg px-4 py-3 rounded-xl mt-4 font-bold text-white'
              >
                Register
              </button>

          </form>

          <p className='mt-6 text-center text-gray-400'>Already have an account? <Link to={"/email"} className='text-accent hover:text-white transition-colors font-semibold'>Login</Link></p>
        </motion.div>
    </div>
  )
}

export default RegisterPage