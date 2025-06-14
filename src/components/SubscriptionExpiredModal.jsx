import React, { useState } from 'react';
import { CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";

import { useNavigate } from 'react-router-dom';


export default function SubscriptionExpiredModal({ onClose, onRenew }) {
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center pb-2">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-center text-xl font-bold">
              Subscription Expired
            </CardTitle>
            <CardDescription className="text-center">
              Your access to premium features has ended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle>Service Limited</AlertTitle>
              <AlertDescription>
                You no longer have access to premium features. Renew now to continue enjoying all benefits.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter >
          
            <Button
              onClick={onRenew} // Use the onRenew prop to trigger dialog in parent
              className="w-full  bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Renew Subscription
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}