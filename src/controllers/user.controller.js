import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'


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

export {registerUser}