import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        // Save refresh token in database
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        
        return {accessToken,refreshToken}   
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating token')
    }
}


const registerUser=asyncHandler(async (req, res) => {
    const {username,fullName,email,password}=req.body
    // console.log(req.body);
    
    if(fullName===''){
        throw new ApiError(400,'Full name is required')
    }
    if(username===''){
        throw new ApiError(400,'Username is required')
    }
    if(email===''){
        throw new ApiError(400,'Email is required')
    }
    if(password===''){
        throw new ApiError(400,'Password is required')
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,'Username or email already exists!!')
    }

    console.log(req.files);
    

    const avatarLocalPath=req.files?.avatar[0]?.path
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
    
    let coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar is required')   
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath,'avatar')
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath, 'coverImage');
    }

    if(!avatar){
        throw new ApiError(400,'Avatar is required')
    }

    const user=await User.create({
        username:username.toLowerCase(),
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,'Something went wrong while registering user')
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,'User created successfully')
    )

})

const loginUser=asyncHandler(async (req, res) => {
    const {email,password,username}=req.body

    if(!email && !username){
        throw new ApiError(400,'Email or username is required')
    }
    if(!password){
        throw new ApiError(400,'Password is required')
    }

    const user=await User.findOne({
        $or:[{email},{username}]
    })
    if(!user){
        throw new ApiError(404,'User does not exist')
    }

    const isPassValid=await user.isPasswordMatch(password)

    if(!isPassValid){
        throw new ApiError(401,'Password is incorrect')
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options={
        httpOnly:true,
        secure:true,
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,
                accessToken,
                refreshToken
            },
            'User logged in successfully')
    )
})

const logOutUser=asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true,
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},'User logged out successfully')
    )
})

const refreshAccessToken=asyncHandler(async (req, res) => {
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,'unauthorized request')
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,'Invalid refresh token')
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,'Refresh token is expired or used')
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(200,
                {
                    accessToken,
                    refreshToken:newRefreshToken
                },
                'Access token refreshed successfully')
        )
    } catch (error) {
        throw new ApiError(401,error?.message || 'Invalid refresh token')
    }   
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordMatch(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,'Old password is incorrect')
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(
        new ApiResponse(200,{},'Password changed successfully')
    )
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(
        200,
        req.user,
        "User fetched successfully"
    )
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){    
        throw new ApiError(400,'Full name and email is required')
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email,
            }
        },
        {new:true},
    ).select(
        "-password"
    )

    return res.status(200).json(
        new ApiResponse(200,user,'User updated successfully')
    )
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar is required')   
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath,'avatar')

    if(!avatar.url){
        throw new ApiError(400,'Error while uploading avatar')
    } 

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select(
        "-password"
    )
    return res.status(200).json(
        new ApiResponse(200,user,'User avatar updated successfully')
    )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,'Cover image is required')    
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath,'avatar')

    if(!coverImage.url){
        throw new ApiError(400,'Error while uploading cover image')
    } 

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select(
        "-password"
    )
    return res.status(200).json(
        new ApiResponse(200,user,'User cover image updated successfully')
    )
})

export {registerUser,loginUser,logOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage}